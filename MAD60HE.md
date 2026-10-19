# hmkconf, MAD60 HE fork

Part of **project Unmad** (fully open firmware for the Madlions MAD60 HE:
[unmad-firmware](https://github.com/thienanbeou/unmad-firmware/tree/unmad/keyboards/mad60he),
[unmad-bootloader](https://github.com/thienanbeou/unmad-bootloader) and this
configurator). Unofficial; not made or supported by Madlions. Hosted build:
https://thienanbeou.github.io/unmad-configurator/.

Fork of [hmkconf](https://github.com/peppapighs/hmkconf) (upstream `main`
22884ba), branch `unmad`, for the Madlions MAD60 HE running the MAD60 HE
fork of libhmk (Unmad firmware v1.0 or later). v1.1 adds Mac mode, the Caps
Lock indicator and its colour, Grave Escape / Repeat Key and 52 effects; on
v1.0 the effect list shows only its 21 and the Caps colour controls hide,
while the Mac Mode and Caps switches still show and do nothing. Works with
other libhmk keyboards too; the extra tabs hide themselves where the
firmware lacks the commands.

## Run

    npm install          # once
    npm run build        # -> build/index.html, open it from disk (no server)
    npm run dev          # alternative: http://localhost:5173

Open `build/index.html` in Chrome / Edge / Brave (WebHID; connecting from
file:// works). The build is one ~1.75 MB file
with all JS, CSS, fonts and images inlined (svelte.config.js: adapter-static
3, `bundleStrategy: "inline"`, hash routes `#/demo`; vite.config.ts:
`assetsInlineLimit`, without which the screenshots and fonts were looked up
next to index.html and missing). The `_app/` folder the build also writes is
not needed. GitHub Pages serves `index.html` plus the favicon, icons and
manifest from the `gh-pages` branch, with `.nojekyll`. Rebuild after every
source change, the file does not update itself. Internal links are `#/...`
(path routes like `/demo` no longer exist, also in dev). adapter-static is
pinned to 3 (4 needs SvelteKit 3); adapter-vercel is unused but still
installed.

`npm run dev`: the first page load after each start is slow (dev mode serves
every module separately and Vite re-optimizes dependencies on the first visit
of a tab, which reloads the page once); after that it is fast.
`npm run lint` flags every file because git checked the repo out with CRLF;
`npx prettier --check --end-of-line auto <files>` checks real style.

## What the fork adds

- **Tap Dance** advanced key (firmware type 6): Tap, Hold, Double tap, Tap then
  hold, each a macro chain (one Press step = that key, held while held), plus
  the tapping term. Files: `src/lib/libhmk/advanced-keys.ts`,
  `src/lib/libhmk/commands/advanced-keys.ts`,
  `src/lib/configurator/lib/advanced-keys.ts`,
  `config-menu/tap-dance/tap-dance-config-menu.svelte`,
  `config-menu/macro/macro-sequence.svelte` (one chain, shared with the Macro
  editor).
- **Reorder macro steps** (Macro keys and every Tap Dance action): grip
  handle on each step, drag and drop or Arrow Up / Down. The nodes and links
  stay put; only keycode / action / delay move between them, so heads and
  `next` stay valid (`move()` in `macro-sequence.svelte`).
- **Two upstream bugs fixed** that corrupt tap dances: an unknown advanced key
  type was written back as zeros, and new macros were placed on nodes that tap
  dances use (`findEmptyMacroNode` only followed Macro keys).
- **Lighting** tab (commands 0xE0-0xE3, 0xE7 / 0xE8): all 52 QMK effects
  (21 before firmware v1.1; names and controls in `rgbEffectMetadata`),
  brightness (the stock firmware never went above 210; the firmware allows 255), speed, base
  colour, per-key colours for the Custom effect. "Color range" slider (`hueRange`, GET_RGB byte 8 / SET_RGB
  byte 7) for the rainbow effects, whose colour picker now sets the centre;
  Digital Rain takes the colour too. Slider 0-255, 255 shows "Full rainbow".
  Below full the colours move 2 * range / 255 times as fast as full (the
  firmware's fold); kept on purpose, with the full 0-255 slider. Hidden
  behind "no lighting" on other firmware. Firmware v1.1: Caps Lock indicator
  colour picker and brightness slider (GET/SET_RGB_CAPS 0xE7 / 0xE8, HSV;
  hidden when the firmware does not answer; grayed out while the Caps Lock
  Indicator switch in Settings is off). Typing Heatmap's Speed slider sets
  its fade (firmware v1.2; `speedHint` in `rgbEffectMetadata`; v1.1 ignores
  it). `src/lib/libhmk/rgb.ts`,
  `src/lib/libhmk/commands/rgb.ts`,
  `src/lib/configurator/lighting/lighting-tab.svelte`,
  `src/lib/configurator/queries/rgb-query.svelte.ts`.
- **Stock switches**: WASD Swap, Win Lock, 6KRO Only in Settings (option bits
  3-5) and as keys (`SP_WASD_SWAP` 0xF0, `SP_GUI_LOCK` 0xF1,
  `SP_NKRO_TOGGLE` 0xF2) in the Special keycodes. Firmware v1.1 adds Mac
  Mode (bit 6, `SP_MAC_MODE` 0xF5) and Caps Lock Indicator (bit 7, stored
  inverted) switches, and the keys Grave Escape (`SP_GRAVE_ESCAPE` 0xF3) and
  Repeat Key (`SP_REPEAT_KEY` 0xF4). Stock hmkconf writes the options from
  the fields it knows and would clear these bits.
- Upstream bug fixed: Delete inside the advanced key editor cleared slot 0
  (the first advanced key) instead of the open key.
- Upstream bug fixed: the advanced key editor header showed "Unknown 0x108"
  (it passed the firmware version instead of the key type).
- **Remap tab shows advanced keys**: a key taken over by Tap Dance / Macro /
  Tap-Hold / Toggle / Dynamic Keystroke shows that icon (tooltip "Tap Dance
  Key" etc.) instead of its ignored keymap entry, which was often "No
  Binding". Null Bind keys keep their keycode (the firmware still sends it).
  `src/lib/configurator/remap/remap-keyboard.svelte`. Remapping such a key
  changes only the hidden keymap entry.

## Checks

- `node scripts/check-fork.mjs DUMP.json`: on a board's real advanced key and
  macro bytes (a JSON dump of one profile's advanced keys and macros): tap
  dances parse and write back byte for byte, a new macro never takes a tap
  dance node, colour math = firmware.
- `node scripts/smoke-demo.mjs URL OUTDIR` and
  `node scripts/smoke-bind.mjs URL OUTDIR`: headless Edge over CDP (Edge's
  default Windows install path is set at the top). `URL` = the file build
  `file:///<checkout>/build/index.html#/demo` (after `npm run build`; no
  priming needed) or `npx vite dev --port 5199` with
  `http://localhost:5199/#/demo`. Copy the CDP part of smoke-demo.mjs for a
  one-off check.
- `node scripts/smoke-delete.mjs URL OUTDIR` (same URL): deleting an
  advanced key from its own editor removes that key, not slot 0 (an upstream
  bug fixed in the fork: the Delete dialog read the open key's index after
  closing the editor). Exit code 1 on failure.
- `node scripts/smoke-reorder.mjs URL OUTDIR` (same URL): macro steps
  reorder by drag and by Arrow Up / Down on the grip handle. Exit code 1 on
  failure.
