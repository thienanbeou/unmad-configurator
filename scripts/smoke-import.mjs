// Headless Edge check of profile import across sizes (MAD60 HE fork): a profile
// exported with fewer layers / advanced keys / macro steps than the keyboard
// has (Unmad v1.3 and older) imports, padded; a bigger one is refused.
// usage: node scripts/smoke-import.mjs URL OUTDIR   (URL as smoke-demo.mjs)
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
await send("DOM.enable")
await send("Page.navigate", { url })
await sleep(6000)
errors.length = 0
const report = { url }
const toastText = () =>
  evaluate(
    `[...document.querySelectorAll("[data-sonner-toast]")].map((e) => e.textContent.trim()).join(" | ")`,
  )
const openMenu = (profile, item) =>
  evaluate(`(async () => {
    const card = [...document.querySelectorAll("div")].find((e) => e.firstElementChild?.textContent.trim() === ${JSON.stringify(`Profile ${profile}`)} && e.querySelector("button"))
    if (!card) return "no card"
    card.querySelector("button[aria-haspopup], button").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }))
    await new Promise((r) => setTimeout(r, 600))
    const it = [...document.querySelectorAll("[role=menuitem]")].find((e) => e.textContent.trim() === ${JSON.stringify(item)})
    if (!it) return "no item"
    it.click()
    return true
  })()`)
const exported = async (profile) => {
  report[`export${profile}`] = await openMenu(profile, "Export")
  await sleep(1000)
  return JSON.parse(
    await evaluate(
      `fetch(document.querySelector("a[download]").href).then((r) => r.text())`,
    ),
  )
}
const importFile = async (profile, config, name) => {
  const path = `${out}/${name}.json`.replace(/\//g, "\\")
  writeFileSync(path, JSON.stringify(config))
  report[`import${profile}-${name}`] = await openMenu(profile, "Import")
  await sleep(500)
  const { root } = await send("DOM.getDocument").then((m) => m.result)
  const { nodeId } = await send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: "input[type=file]",
  }).then((m) => m.result)
  await send("DOM.setFileInputFiles", { nodeId, files: [path] })
  await sleep(2000)
  return toastText()
}

report.profiles = await clickText("Profiles")
await sleep(1500)
const full = await exported(1)
const layers = full.profile.keymap.length
const aks = full.profile.advancedKeys.length
const nodes = full.profile.macros.length
// Smaller: one layer, 2 advanced key slots and 8 macro steps fewer, and a
// marker key (F12 = 0x43) on layer 0
const small = structuredClone(full)
small.profile.keymap = small.profile.keymap.slice(0, layers - 1)
small.profile.keymap[0][0] = 0x43
small.profile.advancedKeys = small.profile.advancedKeys.slice(0, aks - 2)
small.profile.macros = small.profile.macros.slice(0, nodes - 8)
report.smallToast = await importFile(2, small, "small")
const back = await exported(2)
report.padded =
  back.profile.keymap.length === layers &&
  back.profile.keymap[0][0] === 0x43 &&
  back.profile.keymap[layers - 1].every((k) => k === 1) &&
  back.profile.advancedKeys.length === aks &&
  back.profile.macros.length === nodes
// Bigger: one layer too many, refused, nothing written
const big = structuredClone(full)
big.profile.keymap.push(big.profile.keymap[0])
big.profile.keymap[0][0] = 0x44
report.bigToast = await importFile(2, big, "big")
report.bigRefused =
  report.bigToast.includes("not a valid") &&
  (await exported(2)).profile.keymap[0][0] === 0x43
report.smallImported = report.smallToast.includes(
  "Successfully imported Profile 2",
)
report.errors = errors.filter(
  (e) => !e.includes("ZodError") && !e.includes("Object"),
)
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
ws.close()
edge.kill()
process.exit(0)
