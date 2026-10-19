// Headless Edge smoke test of the fork's demo page over CDP (no hardware).
// Start `npx vite dev --port 5199`, then: node scripts/smoke-demo.mjs http://localhost:5199/demo OUTDIR
// Primes Vite (first visits re-optimize deps and reload), then checks the Lighting,
// Advanced Keys (Tap Dance flow) and Settings tabs; screenshots + report.json in OUTDIR.
import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"

const [url, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
const port = 9333
const edge = spawn(EDGE, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${out}/edge-profile`,
  "--window-size=1600,1000",
  "about:blank",
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    target = list.find((t) => t.type === "page")
  } catch {
    // Edge not listening yet
  }
}
if (!target) throw new Error("no CDP target")

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0
const pending = new Map()
const errors = []
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  } else if (msg.method === "Runtime.exceptionThrown") {
    errors.push(
      "exception: " + msg.params.exceptionDetails.exception?.description,
    )
  } else if (
    msg.method === "Runtime.consoleAPICalled" &&
    msg.params.type === "error"
  ) {
    errors.push(
      "console.error: " +
        msg.params.args.map((a) => a.value ?? a.description).join(" "),
    )
  }
})
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expr) =>
  (
    await send("Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    })
  ).result?.result?.value
const shot = async (name) => {
  const { result } = await send("Page.captureScreenshot", { format: "png" })
  writeFileSync(`${out}/${name}.png`, Buffer.from(result.data, "base64"))
}
const clickText = (text) =>
  evaluate(`(() => {
    const el = [...document.querySelectorAll("button, a, [role=tab], [role=menuitem]")]
      .find((e) => e.textContent.trim() === ${JSON.stringify(text)})
    if (!el) return false
    el.click()
    return true
  })()`)

await send("Runtime.enable")
await send("Page.enable")
// Prime: open every tab once so Vite optimizes all dependencies (it reloads
// the page when it does), then start over on a stable server
await send("Page.navigate", { url })
await sleep(6000)
for (const tab of [
  "Profiles",
  "Performance",
  "Advanced Keys",
  "Gamepad",
  "Calibration",
  "Lighting",
  "Settings",
  "Remap",
]) {
  await clickText(tab)
  await sleep(2500)
}
await sleep(6000)
await send("Page.navigate", { url })
await sleep(6000)
errors.length = 0
await shot("01-demo")
const report = { url }
report.lighting = await clickText("Lighting")
await sleep(3000)
await shot("02-lighting")
report.lightingText = await evaluate(
  `document.body.innerText.includes("Rainbow Pinwheels") && document.body.innerText.includes("Brightness")`,
)
// Effect picker: open it, count the effects, pick Custom
report.openPicker = await evaluate(
  `(() => { const t = document.querySelector("#rgb-effect"); if (!t) return false; t.click(); return true })()`,
)
await sleep(1000)
await shot("02b-effect-picker")
report.effectOptions = await evaluate(
  `document.querySelectorAll("[data-slot=popover-content] button[aria-pressed]").length`,
)
report.setCustom = await evaluate(
  `(() => { const b = [...document.querySelectorAll("[data-slot=popover-content] button")].find((e) => e.textContent.trim() === "Custom (per-key colors)"); if (!b) return false; b.click(); return true })()`,
)
await sleep(3000)
report.customUi = await evaluate(
  `document.body.innerText.includes("Key Colors")`,
)
await shot("03-lighting-custom")
report.advancedKeys = await clickText("Advanced Keys")
await sleep(3000)
report.tapDanceListed = await evaluate(
  `document.body.innerText.includes("Tap Dance")`,
)
await shot("04-advanced-keys")
report.settings = await clickText("Settings")
await sleep(3000)
report.settingsText = await evaluate(
  `["WASD Swap", "Win Lock", "6KRO Only"].every((t) => document.body.innerText.includes(t))`,
)
await shot("05-settings")
// Tap Dance editor flow
const clickWhere = (pred) =>
  evaluate(`(() => {
    const el = [...document.querySelectorAll("button, [role=radio], [role=button]")].find(${pred})
    if (!el) return false
    el.click()
    return true
  })()`)
await clickText("Advanced Keys")
await sleep(3000)
report.td = {}
report.td.openCreate = await clickWhere(
  `(e) => e.textContent.trim().startsWith("Tap Dance")`,
)
await sleep(2000)
report.td.keyCandidates = await evaluate(
  `[...document.querySelectorAll("button")].filter((e) => e.textContent.trim() === "A").map((e) => ({ disabled: e.disabled, state: e.dataset.state, pressed: e.getAttribute("aria-pressed"), cls: e.className.slice(0, 40) }))`,
)
report.td.pickKey = await evaluate(`(() => {
  const el = [...document.querySelectorAll("button[aria-pressed]")].find((e) => e.textContent.trim() === "A" && !e.disabled)
  if (!el) return false
  el.click()
  return el.getAttribute("aria-pressed")
})()`)
await sleep(1500)
report.td.continue = await clickText("Continue")
await sleep(3000)
report.td.menu = await evaluate(
  `["Configure Tap Dance Actions", "Tap then hold", "Double tap", "Hold"].every((t) => document.body.innerText.includes(t))`,
)
await shot("06-tap-dance-menu")
report.td.add = await clickWhere(`(e) => e.textContent.trim() === "Add"`)
await sleep(2500)
report.td.nodes = await evaluate(
  `document.body.innerText.includes("No macro actions") ? document.body.innerText.split("No macro actions").length - 1 : -1`,
)
// Select the new step and bind it to "B" from the Basic keycode list
report.td.title = await evaluate(
  `document.body.innerText.includes("Unknown") ? "has Unknown" : "ok"`,
)
// The step's key square: a toggle-group item with no text, below "Tap"
report.td.selectStep = await evaluate(`(() => {
  const items = [...document.querySelectorAll("button[data-state]")].filter((e) => e.textContent.trim() === "" && e.closest("[role=group]"))
  if (!items.length) return "none"
  items[0].click()
  return items.length + " candidates, state now " + items[0].dataset.state
})()`)
await sleep(1500)
report.td.bind = await evaluate(`(() => {
  const el = [...document.querySelectorAll("button")].filter((e) => e.textContent.trim() === "B").pop()
  if (!el) return false
  el.click()
  return true
})()`)
await sleep(2500)
await shot("07-tap-dance-bound")
report.td.done = await clickText("Done")
await sleep(2500)
report.td.listRow = await evaluate(
  `document.body.innerText.includes("Tap") && document.body.innerText.includes("200ms")`,
)
await shot("08-tap-dance-list")
report.errors = errors
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
ws.close()
edge.kill()
process.exit(0)
