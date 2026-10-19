// Headless Edge check of the fork's demo page over CDP (no hardware): macro
// steps reorder by drag and drop and by Arrow Up / Down on the grip handle.
// Tap Dance on A, Tap action J K Z; drag J onto Z -> K Z J; Arrow Up on J ->
// K J Z with focus on J's handle. Usage as smoke-demo.mjs:
// node scripts/smoke-reorder.mjs file:///<checkout>/build/index.html#/demo OUTDIR
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
const steps = () =>
  evaluate(`(() => {
  const g = document.querySelector("[role=group]:has([data-step-handle])")
  return g ? [...g.querySelectorAll("[data-step-handle]")].map((h) => h.parentElement.parentElement.children[1].textContent.trim()) : null
})()`)
await send("Runtime.enable")
await send("Page.enable")
await send("Page.navigate", { url })
await sleep(5000)
const r = {}
await clickText("Advanced Keys")
await sleep(2500)
await evaluate(
  `[...document.querySelectorAll("button")].find((e) => e.textContent.trim().startsWith("Tap Dance")).click()`,
)
await sleep(1500)
await evaluate(
  `[...document.querySelectorAll("button[aria-pressed]")].find((e) => e.textContent.trim() === "A" && !e.disabled).click()`,
)
await sleep(1000)
await clickText("Continue")
await sleep(2500)
for (let k = 0; k < 3; k++) {
  await evaluate(
    `[...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "Add").click()`,
  )
  await sleep(1500)
}
for (const [k, key] of ["J", "K", "Z"].entries()) {
  r["select" + key] = await evaluate(`(() => {
    const g = document.querySelector("[role=group]:has([data-step-handle])")
    const b = g.querySelectorAll("[data-step-handle]")[${k}].parentElement.parentElement.children[1].querySelector("button")
    b.click()
  })()`)
  await sleep(600)
  r["select" + key] = await evaluate(`(() => {
    const g = document.querySelector("[role=group]:has([data-step-handle])")
    const b = g.querySelectorAll("[data-step-handle]")[${k}].parentElement.parentElement.children[1].querySelector("button")
    if (b.dataset.state !== "on") b.click()
    return true
  })()`)
  await sleep(600)
  r["state" + key] = await evaluate(
    `document.querySelector("[role=group]:has([data-step-handle])").querySelectorAll("[data-step-handle]")[${k}].parentElement.parentElement.children[1].querySelector("button").dataset.state`,
  )
  await evaluate(
    `[...document.querySelectorAll("button")].filter((e) => e.textContent.trim() === ${JSON.stringify(key)}).pop().click()`,
  )
  await sleep(1500)
  r["after" + key] = await steps()
}
r.start = await steps()
// Drag step 0 (X) onto step 2 (Z)
r.drag = await evaluate(`(() => {
  const g = document.querySelector("[role=group]:has([data-step-handle])")
  const handles = g.querySelectorAll("[data-step-handle]")
  const cards = [...handles].map((h) => h.parentElement.parentElement)
  const dt = new DataTransfer()
  handles[0].dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }))
  cards[2].dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }))
  const ring = cards[2].className.includes("ring-2")
  cards[2].dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }))
  handles[0].dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }))
  return { ring }
})()`)
await sleep(2500)
r.afterDrag = await steps()
// Keyboard: focus the last handle (X) and press Arrow Up
r.key = await evaluate(`(() => {
  const g = document.querySelector("[role=group]:has([data-step-handle])")
  const h = g.querySelectorAll("[data-step-handle]")[2]
  h.focus()
  h.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }))
  return true
})()`)
await sleep(2500)
r.afterKey = await steps()
r.focusIndex = await evaluate(
  `[...document.querySelectorAll("[data-step-handle]")].indexOf(document.activeElement)`,
)
await shot("reorder")
r.errors = errors
console.log(JSON.stringify(r))
const ok =
  r.start.join() === "J,K,Z" &&
  r.afterDrag.join() === "K,Z,J" &&
  r.afterKey.join() === "K,J,Z" &&
  r.focusIndex === 1 &&
  !r.errors.length
console.log(ok ? "ok: drag and keyboard reorder" : "FAIL: reorder")
ws.close()
edge.kill()
process.exit(ok ? 0 : 1)
