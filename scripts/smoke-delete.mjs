// Headless Edge check of the fork's demo page over CDP (no hardware): deleting
// an advanced key from its own editor deletes that key, not slot 0 (the Delete
// dialog used to read the open key's index after closing the editor = null).
// Creates Tap Dances on A (slot 0) and S (slot 1), deletes S from its editor,
// expects A to remain. Usage as smoke-demo.mjs:
// node scripts/smoke-delete.mjs file:///<checkout>/build/index.html#/demo OUTDIR
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
const clickWhere = (pred) =>
  evaluate(`(() => {
    const el = [...document.querySelectorAll("button, [role=radio], [role=button]")].find(${pred})
    if (!el) return false
    el.click()
    return true
  })()`)
const activeList = () =>
  evaluate(`(() => {
  const h = [...document.querySelectorAll("div")].find((e) => e.childElementCount === 0 && e.textContent.trim().startsWith("Active Advanced Keys"))
  return h ? h.parentElement.innerText : "no list"
})()`)
const createTapDance = async (keyLabel) => {
  const r = {}
  r.open = await clickWhere(
    `(e) => e.textContent.trim().startsWith("Tap Dance")`,
  )
  await sleep(1500)
  r.pick = await evaluate(`(() => {
    const el = [...document.querySelectorAll("button[aria-pressed]")].find((e) => e.textContent.trim() === ${JSON.stringify(keyLabel)} && !e.disabled)
    if (!el) return false
    el.click(); return true
  })()`)
  await sleep(1000)
  r.cont = await clickText("Continue")
  await sleep(2000)
  return r
}
await send("Runtime.enable")
await send("Page.enable")
await send("Page.navigate", { url })
await sleep(5000)
const r = {}
await clickText("Advanced Keys")
await sleep(2500)
r.a = await createTapDance("A")
r.doneA = await clickText("Done")
await sleep(1500)
r.listAfterA = await activeList()
r.s = await createTapDance("S")
// Now in the editor of the S tap dance (slot 1): its own Delete button
r.del = await clickText("Delete")
await sleep(1000)
r.remove = await clickText("Remove")
await sleep(2000)
r.listAfterDelete = await activeList()
await shot("after-delete")
r.errors = errors
console.log(JSON.stringify(r, null, 1))
const ok =
  /^A$/m.test(r.listAfterDelete) &&
  !/^S$/m.test(r.listAfterDelete) &&
  !r.errors.length
console.log(ok ? "ok: S deleted, A kept" : "FAIL: wrong advanced key deleted")
ws.close()
edge.kill()
process.exit(ok ? 0 : 1)
