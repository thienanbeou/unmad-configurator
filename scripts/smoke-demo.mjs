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
// Color calibration: a test color switches to Solid Color in it (White, then
// Red), then "Back to my effect" restores the effect
// The calibration and indicators are folded: closed at first, open on a click
report.foldedAtStart = await evaluate(
  `![...document.querySelectorAll("#rgb-layer-color, #rgb-caps-color, button")].some((e) => e.checkVisibility() && (e.tagName === "INPUT" || e.textContent.trim() === "Back to my effect"))`,
)
report.openCalibration = await clickText("Color Calibration")
await sleep(1000)
report.showWhite = await clickText("White")
await sleep(1500)
report.whiteShown = await evaluate(
  `document.querySelector("#rgb-effect").textContent.trim() === "Solid Color" && document.querySelector("#rgb-color").value === "#ffffff"`,
)
report.showRed = await clickText("Red")
await sleep(1500)
report.redShown = await evaluate(
  `document.querySelector("#rgb-color").value === "#ff0000" && [...document.querySelectorAll("button[aria-pressed=true]")].some((e) => e.textContent.trim() === "Red")`,
)
await shot("02a-white-balance")
report.backToEffect = await clickText("Back to my effect")
await sleep(1500)
report.effectRestored = await evaluate(
  `document.querySelector("#rgb-effect").textContent.trim() === "Rainbow Pinwheels"`,
)
// Layer indicator (firmware v1.3): a colour per layer (layer 2 green by
// default) and the mode for the other keys
report.openCaps = await clickText("Caps Lock Indicator")
report.openLayer = await clickText("Layer Indicator")
await sleep(1000)
report.capsShown = await evaluate(
  `!!document.querySelector("#rgb-caps-color")?.checkVisibility()`,
)
report.layer2 = await clickText("Layer 2")
await sleep(1000)
report.layer2Green = await evaluate(
  `document.querySelector("#rgb-layer-color").value === "#00ff00"`,
)
report.layerWholeBoard = await clickText("Whole board")
await sleep(1500)
report.layerWholeBoardShown = await evaluate(
  `[...document.querySelectorAll("button[aria-pressed=true]")].some((e) => e.textContent.trim() === "Whole board") && document.body.innerText.includes("Every key lights in the layer's color")`,
)
await evaluate(
  `[...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "Whole board")?.scrollIntoView({ block: "center" })`,
)
await sleep(500)
await shot("02c-layer-indicator")
// Effect picker: open it, count the effects, pick Custom
report.openPicker = await evaluate(
  `(() => { const t = document.querySelector("#rgb-effect"); if (!t) return false; t.click(); return true })()`,
)
await sleep(1000)
await shot("02b-effect-picker")
report.effectOptions = await evaluate(
  `document.querySelectorAll("[data-slot=popover-content] button[aria-pressed]").length`,
)
// Short window: pick an effect from the last group, reopen, and the picker
// must start scrolled to it, with it focused
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 560,
  deviceScaleFactor: 1,
  mobile: false,
})
await sleep(1000)
const pickEffect = (title) =>
  evaluate(
    `(() => { const b = [...document.querySelectorAll("[data-slot=popover-content] button")].find((e) => e.textContent.trim() === ${JSON.stringify(title)}); if (!b) return false; b.click(); return true })()`,
  )
const openPicker = () =>
  evaluate(
    `(() => { const t = document.querySelector("#rgb-effect"); if (!t) return false; t.click(); return true })()`,
  )
if (
  !(await evaluate(`!!document.querySelector("[data-slot=popover-content]")`))
)
  await openPicker()
await sleep(800)
report.pickLast = await pickEffect("Typing Heatmap")
await sleep(1500)
await openPicker()
await sleep(1500)
report.pickerAtCurrent = await evaluate(`(() => {
  const c = document.querySelector("[data-slot=popover-content]")
  const b = c?.querySelector("button[aria-pressed=true]")
  if (!b) return "no current"
  const cr = c.getBoundingClientRect(), br = b.getBoundingClientRect()
  return { scrolled: c.scrollTop > 0, visible: br.top >= cr.top && br.bottom <= cr.bottom, focused: document.activeElement === b, title: b.textContent.trim() }
})()`)
await shot("02c-picker-short")
await send("Emulation.clearDeviceMetricsOverride")
await sleep(1000)
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
  `["WASD Swap", "Win Lock", "6KRO Only", "Layer Indicator", "Both Shifts Turn On Caps Word", "Lighting Idle Timeout: Off"].every((t) => document.body.innerText.includes(t))`,
)
await shot("05-settings")
// Remap key picker: the Layers section lists the layer keys (firmware v1.2)
await clickText("Remap")
await sleep(2500)
report.layersSection = await clickText("Layers")
await sleep(1500)
report.layerKeys = await evaluate(
  `["MO(1)", "TO(1)", "DF(1)", "OSL(1)", "Layer Lock", "OS LShift"].filter((t) => ![...document.querySelectorAll("button")].some((b) => b.innerText.trim().replace(/\\s+/g, " ") === t))`,
)
await shot("05b-layer-keys")
// Lighting keys and Caps Word (firmware v1.5)
const openSection = (title) =>
  evaluate(
    `(() => { const t = [...document.querySelectorAll("[data-slot=accordion-trigger]")].find((e) => e.textContent.trim() === ${JSON.stringify(title)}); if (!t) return false; if (t.getAttribute("aria-expanded") !== "true") t.click(); return true })()`,
  )
report.lightingSection = await openSection("Lighting")
await sleep(1500)
report.lightingKeys = await evaluate(
  `["RGB Toggle", "RGB Next", "Bright Up", "Hue Down", "Speed Up"].filter((t) => ![...document.querySelectorAll("button")].some((b) => b.checkVisibility() && b.innerText.trim().replace(/\\s+/g, " ") === t))`,
)
report.specialSection = await openSection("Special")
await sleep(1500)
report.capsWordKey = await evaluate(
  `[...document.querySelectorAll("button")].some((b) => b.checkVisibility() && b.innerText.trim().replace(/\\s+/g, " ") === "Caps Word")`,
)
await shot("05b2-lighting-keys")
// Reset Current Layer asks first; Cancel keeps the keymap
report.resetAsk = await clickText("Reset Current Layer")
await sleep(1000)
report.resetDialog = await evaluate(
  `[...document.querySelectorAll("[role=dialog]")].some((d) => d.textContent.includes("Reset layer 0?") && d.textContent.includes("Are you sure?"))`,
)
await shot("05c-reset-layer-dialog")
report.resetCancel = await clickText("Cancel")
await sleep(1000)
report.resetDialogClosed = await evaluate(
  `!document.querySelector("[role=dialog]")`,
)
// Layers and profiles in use (firmware v1.4; the demo starts at 3 x 3 of
// 4 x 4): "+" adds a layer next to the layer buttons, then hides at the max;
// the Profiles tab adds a profile
const layerButtons = () =>
  evaluate(
    `[...document.querySelectorAll("[data-slot=toggle-group-item]")].filter((e) => e.checkVisibility() && /^[0-9]$/.test(e.textContent.trim())).length`,
  )
report.layersBefore = await layerButtons()
await shot("05c2-add-layer")
report.addLayer = await evaluate(
  `(() => { const b = document.querySelector("button[aria-label='Add a layer']"); if (!b) return false; b.click(); return true })()`,
)
await sleep(1500)
report.layersAfter = await layerButtons()
report.addLayerGone = await evaluate(
  `!document.querySelector("button[aria-label='Add a layer']")`,
)
report.layersAdded =
  report.layersBefore === 3 && report.layersAfter === 4 && report.addLayerGone
// The count, then the trash asks first and takes the last layer out
const visibleText = (t) =>
  evaluate(
    `[...document.querySelectorAll("span")].some((e) => e.checkVisibility() && e.textContent.trim() === ${JSON.stringify(t)})`,
  )
report.layerCount4 = await visibleText("4/4")
report.removeLayerAsk = await evaluate(
  `(() => { const b = [...document.querySelectorAll("button[aria-label='Remove the last layer']")].find((e) => e.checkVisibility()); if (!b) return false; b.click(); return true })()`,
)
await sleep(1000)
report.removeLayerDialog = await evaluate(
  `[...document.querySelectorAll("[role=dialog]")].some((d) => d.textContent.includes("Remove layer 3?") && d.textContent.includes("Layer 0 always stays"))`,
)
await shot("05c3-remove-layer-dialog")
report.removeLayer = await clickText("Remove Layer 3")
await sleep(1500)
report.layersRemoved =
  (await layerButtons()) === 3 && (await visibleText("3/4"))
report.profilesTab = await clickText("Profiles")
await sleep(1500)
report.addProfile = await clickText("Add Profile 3")
await sleep(1500)
report.profilesAdded = await evaluate(
  `document.body.innerText.includes("Profile 3") && ![...document.querySelectorAll("button")].some((e) => e.textContent.includes("Add Profile"))`,
)
await shot("05d-profiles-added")
report.profileCount4 = await visibleText("4/4")
report.removeProfileAsk = await clickText("Remove Profile 3")
await sleep(1000)
report.removeProfileDialog = await evaluate(
  `[...document.querySelectorAll("[role=dialog]")].some((d) => d.textContent.includes("Remove profile 3?") && d.textContent.includes("Profile 0 always stays"))`,
)
report.removeProfile = await evaluate(
  `(() => { const b = [...document.querySelectorAll("[role=dialog] button")].find((e) => e.textContent.trim() === "Remove Profile 3"); if (!b) return false; b.click(); return true })()`,
)
await sleep(1500)
report.profilesRemoved =
  !(await evaluate(
    `[...document.querySelectorAll("div")].some((e) => e.textContent.trim() === "Profile 3")`,
  )) && (await visibleText("3/4"))
await clickText("Remap")
await sleep(1500)
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
// The layer can change while creating: the tap dance goes on layer 1
const pickLayer = (n) =>
  evaluate(
    `(() => { const it = [...document.querySelectorAll("[data-slot=toggle-group-item]")].find((e) => e.checkVisibility() && e.textContent.trim() === "${n}"); if (!it || it.disabled) return false; it.click(); return true })()`,
  )
// The A key's position (its label differs on layer 1)
const keyA = await evaluate(
  `[...document.querySelectorAll("button[aria-pressed]")].findIndex((e) => e.textContent.trim() === "A")`,
)
report.td.layer1 = await pickLayer(1)
await sleep(1000)
report.td.stillCreating = await evaluate(
  `[...document.querySelectorAll("button")].some((e) => e.checkVisibility() && e.textContent.trim() === "Continue")`,
)
report.td.keyCandidates = await evaluate(
  `[...document.querySelectorAll("button")].filter((e) => e.textContent.trim() === "A").map((e) => ({ disabled: e.disabled, state: e.dataset.state, pressed: e.getAttribute("aria-pressed"), cls: e.className.slice(0, 40) }))`,
)
report.td.pickKey = await evaluate(`(() => {
  const el = [...document.querySelectorAll("button[aria-pressed]")][${keyA}]
  if (!el || el.disabled) return false
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
// Clicking the step's selected action must keep it (it used to deselect and
// store "none", which turned the step off)
const actionState = () =>
  evaluate(
    `[...document.querySelectorAll("button[data-state]")].filter((e) => ["Tap", "Press", "Release"].includes(e.textContent.trim())).map((e) => e.textContent.trim() + ":" + e.dataset.state).join(" ")`,
  )
report.td.actionBefore = await actionState()
await evaluate(
  `[...document.querySelectorAll("button[data-state=on]")].find((e) => e.textContent.trim() === "Tap")?.click()`,
)
await sleep(1500)
report.td.actionAfterReclick = await actionState()
report.td.actionKept =
  report.td.actionBefore.includes("Tap:on") &&
  report.td.actionAfterReclick.includes("Tap:on")
await shot("07-tap-dance-bound")
report.td.done = await clickText("Done")
await sleep(2500)
report.td.listRow = await evaluate(
  `document.body.innerText.includes("Tap") && document.body.innerText.includes("200ms")`,
)
// It is on layer 1: its Edit button (in the list of every layer's advanced
// keys) switches to its own layer
await pickLayer(0)
await sleep(1000)
report.td.editRow = await evaluate(
  `(() => { const b = [...document.querySelectorAll("button")].find((e) => e.checkVisibility() && e.textContent.trim() === "Edit"); if (!b) return false; b.click(); return true })()`,
)
await sleep(1500)
report.td.onLayer1 = await evaluate(
  `[...document.querySelectorAll("[data-slot=toggle-group-item]")].some((e) => e.checkVisibility() && e.dataset.state === "on" && e.textContent.trim() === "1")`,
)
await shot("08-tap-dance-list")
report.errors = errors
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
ws.close()
edge.kill()
process.exit(0)
