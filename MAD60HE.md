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
while the Mac Mode and Caps switches still show and do nothing. v1.2 adds
the Layers keys, the layer indicator and Color Calibration; on v1.1 the
layer colour and Color Calibration controls hide, while the Layers keys and
the Layer Indicator switch still show and do nothing. v1.3 adds a layer
indicator colour per layer and its modes; on v1.2 one colour shows and the
mode buttons hide. v1.4 adds the profiles / layers in use (add, remove,
N/8); v1.5 the Lighting keys, Caps Word, the Both Shifts switch and the
Lighting Idle Timeout (hidden on older firmware; the keys and the switch
show but do nothing there). Works with
other libhmk keyboards too; the extra tabs hide themselves where the
firmware lacks the commands.

## Run

    npm install          # once
    npm run build        # -> build/index.html, open it from disk (no server)
    npm run dev          # alternative: http://localhost:5173

Open `build/index.html` in Chrome / Edge / Brave (WebHID; connecting from
file:// works). The build is one ~1.8 MB file
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
- **A step's selected action stays selected** when clicked again
  (`macro-node.svelte`). The Action toggle group used to deselect, which
  stored MACRO_ACTION_NONE and silently turned the step off.
- **Two upstream bugs fixed** that corrupt tap dances: an unknown advanced key
  type was written back as zeros, and new macros were placed on nodes that tap
  dances use (`findEmptyMacroNode` only followed Macro keys).
- **Lighting** tab (commands 0xE0-0xE3, 0xE7-0xEC): all 52 QMK effects
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
  it). Color Calibration (firmware v1.2, the firmware's white balance,
  GET/SET_RGB_WHITE_BALANCE 0xE9 / 0xEA): R, G, B gain sliders (255 = unchanged), nine test
  colours (White, Red, Green, Blue, Yellow, Cyan, Magenta, Orange, Purple;
  each lights every key as Solid Color in it at the current brightness, the
  lighting before the first one kept in the tab and put back by "Back to my
  effect") and Reset; hidden when the firmware does not answer. Same idea
  as OpenMAD's colour calibration, done in the firmware so every effect is
  corrected. `src/lib/libhmk/rgb.ts`,
  `src/lib/libhmk/commands/rgb.ts`,
  `src/lib/configurator/lighting/lighting-tab.svelte`,
  `src/lib/configurator/queries/rgb-query.svelte.ts`.
- **Stock switches**: WASD Swap, Win Lock, 6KRO Only in Settings (option bits
  3-5) and as keys (`SP_WASD_SWAP` 0xF0, `SP_GUI_LOCK` 0xF1,
  `SP_NKRO_TOGGLE` 0xF2) in the Special keycodes. Firmware v1.1 adds Mac
  Mode (bit 6, `SP_MAC_MODE` 0xF5) and Caps Lock Indicator (bit 7, stored
  inverted) switches, and the keys Grave Escape (`SP_GRAVE_ESCAPE` 0xF3) and
  Repeat Key (`SP_REPEAT_KEY` 0xF4). Stock hmkconf writes the options from
  the fields it knows and would clear these bits. Settings groups the four
  under "Keyboard Switches" (two columns, one-line descriptions); kept next
  to the keys on purpose: the board shows no sign of their state, and a
  remapped key leaves only the switch to turn one off.
- **Layers** (firmware v1.2): a "Layers" section in the key list
  (`src/lib/keycodes/layers.ts`) with MO and Layer Lock (moved from
  Special) plus TO(n), DF(n), One Shot OSL(n) and OSM (8 modifiers) and Tri
  Layer Lower / Upper (only with 4+ layers); keycodes 0xA0-0xBF and 0xF6 /
  0xF7. Layer Indicator switch in Settings (option bit 8, stored inverted)
  and its colour / brightness in Lighting (GET/SET_RGB_LAYER 0xEB / 0xEC,
  hidden when the firmware does not answer, grayed out while the switch is
  off). Firmware v1.3: a colour per layer (a button per layer in use from
  layer 1, up to 7 on v1.4; byte 1
  of GET and byte 4 of SET carry the layer, 0 = layer 1; `getRgbLayer`
  finds per-layer firmware by asking for layer `numLayers`, which v1.3
  refuses and v1.2 answers) and "Other Keys" (option bits 9-10,
  `HMK_LAYER_INDICATOR_MODES`): Effect, Off, Whole board, Pass-through. SET_OPTIONS now sends the options as two bytes (u16 LE); it sent one
  before, which was enough while every bit sat in the low byte.
- **Layout**: the keyboard pane takes about 300 px (35-55% of the window,
  `keyboard-editor-pane.svelte`), the settings pane the rest; one dragged
  split is saved for every tab (`autoSaveId` in `keyboard-editor.svelte`).
  The "window too small" screen starts below 800 x 480 (was 1024 x 768,
  which blocked laptops at 125-150% scaling).
- **Profiles and layers in use** (firmware v1.4, GET/SET_IN_USE 0xED /
  0xEE, `in-use-query.svelte.ts`): the layer buttons (`layer-select.svelte`,
  Remap and Advanced Keys) get a "+", a trash and an "N/8" count; the
  profile picker / Profiles tab an "Add Profile", the Profiles tab also
  "Remove Profile N" and "N/8". Only the last layer / profile can be
  removed (a middle one would renumber the layer / profile keys above it;
  the dialogs say so), never layer 0 / profile 0, after a confirmation; the
  firmware clears what is taken out (a layer to transparent in every
  profile without its advanced keys, a profile to its defaults); the key list's Layers and
  Profiles keys, and the layer indicator colours, follow the counts in use.
  Older firmware: no buttons, every profile and layer shown as before.
- **v1.5 keys and settings**: a "Lighting" section in the key list
  (`src/lib/keycodes/lighting.ts`, 0xD5-0xDF: RGB toggle, next / previous,
  hue / saturation / brightness / speed up and down; Shift reverses) and
  Caps Word (0xE0) in Special; Settings: "Both Shifts Turn On Caps Word"
  (option bit 11) and "Lighting Idle Timeout" (GET/SET_RGB_IDLE 0xEF / 0xF0,
  Off or 1-60 min). Hue and saturation have no sliders on purpose: the
  Lighting tab's Color picker sets exactly those two.
- **Advanced Keys: the layer can change while creating** (`context.svelte.ts`
  `setLayer`): the new key's type stays, its key picks start over on the
  new layer; editing an existing one keeps its layer.
- **Lighting folds**: Color Calibration, Caps Lock Indicator and Layer
  Indicator are closed accordion sections (`ui/accordion`; the items get
  `-mx-1` / `px-1` because the content clips for its animation and cut off
  the buttons' rings).
- **Confirmations**: Reset Current Layer asks first (dialog, like Factory
  Reset, whose text now lists what a factory reset drops). After a factory
  reset the Caps, white balance and layer colours are read again.
- **Wrench** (layout options, `keyboard-editor-layout-dialog.svelte`) is
  hidden on keyboards without layout options (the MAD60 HE has none; it
  opened an empty box).
- **Effect picker** (Lighting): all effects in one grouped panel instead of
  a native select (`effectGroups` in `lighting-tab.svelte`, grouped by name).
  It opens scrolled to the current effect, with focus on it
  (`focusCurrentEffect`, the popover's `onOpenAutoFocus`), so short screens
  do not start at the top of the list.
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
  `http://localhost:5199/#/demo`. smoke-demo covers the Lighting tab (the
  folds closed at first, Color Calibration test colours White and Red, Back
  to my effect, layer 2's colour, the Whole board mode, the effect
  picker with all 52 effects, reopened at 1280 x 560 it must start at the
  current effect, Custom), the Remap key list's Layers section (MO, TO, DF,
  OSL, Layer Lock, OS LShift; Tri Layer keys need 4+ layers in use, the demo
  starts at 3), the Lighting section and Caps Word (v1.5), Reset Current
  Layer's dialog (Cancel keeps the keymap), the layer "+" / trash / N/4 and
  Add / Remove Profile with their dialogs (the demo has room for 4 x 4),
  Advanced Keys (a Tap Dance created on layer 1 after switching layers
  mid-create, bind, re-clicking a step's selected action keeps it) and
  Settings (incl. Both Shifts and the Lighting Idle Timeout); results in OUTDIR/report.json. Copy the CDP part of
  smoke-demo.mjs for a one-off check.
- `node scripts/smoke-import.mjs URL OUTDIR` (same URL): a profile exported
  with fewer layers / advanced keys / macro steps than the keyboard has
  (Unmad v1.3 and older exports into v1.4) imports and is padded (missing
  layers transparent, slots empty); a bigger one is refused, nothing
  written.
- `node scripts/smoke-delete.mjs URL OUTDIR` (same URL): deleting an
  advanced key from its own editor removes that key, not slot 0 (an upstream
  bug fixed in the fork: the Delete dialog read the open key's index after
  closing the editor). Exit code 1 on failure.
- `node scripts/smoke-reorder.mjs URL OUTDIR` (same URL): macro steps
  reorder by drag and by Arrow Up / Down on the grip handle. Exit code 1 on
  failure.
