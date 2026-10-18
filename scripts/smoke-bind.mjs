// Headless Edge check that a selected macro step takes the key picked in Bindings, for a
// Macro key and a Tap Dance key: node scripts/smoke-bind.mjs URL OUTDIR [macro-only]
import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"

const [url, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const edge = spawn(
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--remote-debugging-port=9334",
    `--user-data-dir=${out}/edge-profile2`,
    "--window-size=1600,1000",
    "about:blank",
  ],
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  try {
    target = (await (await fetch("http://127.0.0.1:9334/json")).json()).find(
      (t) => t.type === "page",
    )
  } catch {
    // Edge not listening yet
  }
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0
const pending = new Map()
const errors = []
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  } else if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails.exception?.description)
})
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })
const ev = async (x) =>
  (
    await send("Runtime.evaluate", {
      expression: x,
      awaitPromise: true,
      returnByValue: true,
    })
  ).result?.result?.value
const shot = async (n) =>
  writeFileSync(
    `${out}/${n}.png`,
    Buffer.from(
      (await send("Page.captureScreenshot", { format: "png" })).result.data,
      "base64",
    ),
  )
const click = (pred) =>
  ev(
    `(() => { const el = [...document.querySelectorAll("button")].find(${pred}); if (!el) return false; el.click(); return true })()`,
  )

await send("Runtime.enable")
await send("Page.enable")
// Prime the dev server (dependency optimization reloads the page), then start over
await send("Page.navigate", { url })
await sleep(7000)
for (const t of ["Advanced Keys", "Performance", "Settings", "Remap"]) {
  await click(`(e) => e.textContent.trim() === ${JSON.stringify(t)}`)
  await sleep(2500)
}
await sleep(5000)
await send("Page.navigate", { url })
await sleep(7000)
errors.length = 0
await click(`(e) => e.textContent.trim() === "Advanced Keys"`)
await sleep(3000)

async function flow(type, key) {
  const r = {}
  r.open = await click(
    `(e) => e.textContent.trim().startsWith(${JSON.stringify(type)})`,
  )
  await sleep(2000)
  r.key = await click(
    `(e) => e.hasAttribute("aria-pressed") && e.textContent.trim() === ${JSON.stringify(key)} && !e.disabled`,
  )
  await sleep(1500)
  r.cont = await click(`(e) => e.textContent.trim() === "Continue"`)
  await sleep(3000)
  r.add = await click(`(e) => e.textContent.trim() === "Add"`)
  await sleep(2500)
  r.step = await click(
    `(e) => e.hasAttribute("data-state") && e.textContent.trim() === "" && e.closest("[role=group]")`,
  )
  await sleep(1500)
  r.stepState = await ev(
    `[...document.querySelectorAll("button[data-state]")].filter((e) => e.textContent.trim() === "" && e.closest("[role=group]")).map((e) => e.dataset.state).join(",")`,
  )
  r.bind = await click(
    `(e) => e.textContent.trim() === "B" && e.offsetParent !== null && !e.closest("[role=group]") && !e.hasAttribute("aria-pressed")`,
  )
  await sleep(2500)
  r.stepNow = await ev(
    `[...document.querySelectorAll("[role=group] button[data-state]")].map((e) => e.textContent.trim() || "(empty)").join(",")`,
  )
  await shot(`bind-${type.replace(/ /g, "")}`)
  r.done = await click(`(e) => e.textContent.trim() === "Done"`)
  await sleep(2500)
  return r
}
const report = { macro: await flow("Macro", "S") }
if (process.argv[4] !== "macro-only")
  report.tapDance = await flow("Tap Dance", "D")
report.errors = errors
console.log(JSON.stringify(report, null, 2))
ws.close()
edge.kill()
process.exit(0)
