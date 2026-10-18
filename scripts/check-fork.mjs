// MAD60 HE fork checks, run against the real TypeScript through Vite:
//   node scripts/check-fork.mjs DUMP.json
// DUMP.json holds hex dumps of a board's profile 0 advanced keys and macros
// ({"advanced_keys": "...", "macros": "..."}, the raw staged GET replies).
// Checks: Tap Dance records parse, and writing them back gives the same bytes;
// a new macro never lands on a node a Tap Dance uses; the lighting colour
// math matches the firmware (values from check_mad60he_emu.py, which compares
// against the firmware itself).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createServer } from "vite"

const dump = JSON.parse(readFileSync(process.argv[2], "utf8"))
const akBytes = Buffer.from(dump.advanced_keys, "hex")
const macroBytes = Buffer.from(dump.macros, "hex")

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
})
const load = (path) => server.ssrLoadModule(path)
const ak = await load("/src/lib/libhmk/commands/advanced-keys.ts")
const macros = await load("/src/lib/libhmk/commands/macros.ts")
const types = await load("/src/lib/libhmk/advanced-keys.ts")
const lib = await load("/src/lib/configurator/lib/advanced-keys.ts")
const rgb = await load("/src/lib/libhmk/rgb.ts")
const { HMK_Command } = await load("/src/lib/libhmk/commands/index.ts")

const VERSION = 0x0108
const metadata = {
  numAdvancedKeys: akBytes.length / 12,
  numDynamicKeystrokeMaxBindings: 4,
  numMacroNodes: macroBytes.length / 4,
}

// A fake commander answering the staged GET protocol from the dumps and
// recording SET payloads
function fakeCommander() {
  const sets = []
  return {
    sets,
    async sendCommand({ command, payload = [] }) {
      const blob =
        command === HMK_Command.GET_ADVANCED_KEYS
          ? akBytes
          : command === HMK_Command.GET_MACROS
            ? macroBytes
            : null
      if (blob) {
        const offset = payload[1] | (payload[2] << 8)
        const part = blob.subarray(offset, offset + 62)
        return new DataView(Uint8Array.from([part.length, ...part]).buffer)
      }
      sets.push({ command, payload })
      return new DataView(new ArrayBuffer(63))
    },
  }
}

// 1. Parse and round-trip
const c = fakeCommander()
const keys = await ak.getAdvancedKeys(VERSION, c, metadata, { profile: 0 })
const dances = keys.filter((k) => k.action.type === types.HMK_AKType.TAP_DANCE)
assert.ok(dances.length > 0, "no Tap Dance in the dump")
for (const { action } of dances) {
  assert.equal(action.actions.length, 4)
  assert.ok(action.tappingTerm >= 10 && action.tappingTerm <= 1000)
}
await ak.setAdvancedKeys(VERSION, c, metadata, {
  profile: 0,
  offset: 0,
  data: keys,
})
const written = []
for (const { command, payload } of c.sets) {
  assert.equal(command, HMK_Command.SET_ADVANCED_KEYS)
  const offset = payload[1] | (payload[2] << 8)
  assert.equal(offset, written.length, "SET packets out of order")
  written.push(...payload.slice(4, 4 + payload[3]))
}
assert.deepEqual(
  Buffer.from(written),
  akBytes,
  "advanced keys changed on write",
)
console.log(
  `ok   ${keys.length} advanced keys parsed (${dances.length} Tap Dance:` +
    ` terms ${dances.map((d) => d.action.tappingTerm).join("/")} ms),` +
    ` written back byte for byte`,
)

// 2. New macros never take a node a Tap Dance uses
const nodes = await macros.getMacros(VERSION, fakeCommander(), metadata, {
  profile: 0,
})
const used = new Set(
  keys
    .flatMap(lib.getAdvancedKeyMacroHeads)
    .flatMap((head) => lib.getMacroSequence(nodes, head)),
)
const tdUsed = new Set(
  dances.flatMap((d) =>
    d.action.actions.flatMap((head) => lib.getMacroSequence(nodes, head)),
  ),
)
const free = lib.findEmptyMacroNode(nodes, keys)
assert.ok(free !== null && !used.has(free), `node ${free} is in use`)
// What stock hmkconf would have picked: only Macro keys counted
const stockFree = lib.findEmptyMacroNode(
  nodes,
  keys.filter((k) => k.action.type !== types.HMK_AKType.TAP_DANCE),
)
console.log(
  `ok   next free macro node ${free}; ${tdUsed.size} nodes belong to Tap` +
    ` Dances (stock hmkconf would have reused node ${stockFree}:` +
    ` ${tdUsed.has(stockFree) ? "a Tap Dance node" : "free"})`,
)

// 3. Lighting colour math = firmware (QMK hsv_to_rgb)
// Expected values from the Python reference in check_mad60he_emu.py
assert.deepEqual(rgb.hsvToRgb(152, 195, 210), [49, 118, 210])
assert.deepEqual(rgb.hsvToRgb(0, 255, 210), [210, 0, 0])
assert.deepEqual(rgb.hsvToRgb(255, 255, 255), [255, 0, 0])
for (const hex of ["#2e6fc3", "#ff0000", "#00ff80", "#123456"]) {
  const [h, s] = rgb.rgbToHueSat(rgb.hexToRgb(hex))
  const back = rgb.hsvToRgb(h, s, 255)
  const want = rgb
    .hexToRgb(hex)
    .map((x) => Math.round((x * 255) / Math.max(...rgb.hexToRgb(hex))))
  back.forEach((x, i) =>
    assert.ok(Math.abs(x - want[i]) <= 4, `${hex} -> ${back}`),
  )
}
console.log("ok   lighting colour conversions match the firmware math")

await server.close()
console.log("all ok")
