/*
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <https://www.gnu.org/licenses/>.
 */

// MAD60 HE fork: layer keys (MO and Layer Lock from upstream, the rest QMK's,
// firmware v1.2)

import { DF, Keycode, MO, OSL, OSM, TO } from "$lib/libhmk/keycodes"
import type { KeycodeMetadata } from "."

// OSM order = the firmware's (HID modifier bits)
const modifiers = [
  "LCtrl",
  "LShift",
  "LAlt",
  "LWin",
  "RCtrl",
  "RShift",
  "RAlt",
  "RWin",
]

export const layersKeycodeMetadata: KeycodeMetadata[] = [
  {
    name: "Tri\nLower",
    tooltip:
      "Tri Layer Lower: hold for layer 1; with Tri Upper also held, layer 3. Needs firmware v1.2 or later.",
    keycode: Keycode.SP_TRI_LAYER_LOWER,
    webCodes: [],
    category: "Layers",
  },
  {
    name: "Tri\nUpper",
    tooltip:
      "Tri Layer Upper: hold for layer 2; with Tri Lower also held, layer 3. Needs firmware v1.2 or later.",
    keycode: Keycode.SP_TRI_LAYER_UPPER,
    webCodes: [],
    category: "Layers",
  },
  ...modifiers.map((mod, i): KeycodeMetadata => ({
    name: `OS\n${mod}`,
    tooltip: `One Shot ${mod}: tap, and the next key gets ${mod}; hold it like a normal ${mod}. Needs firmware v1.2 or later.`,
    keycode: OSM(i),
    webCodes: [],
    category: "Layers",
  })),
]

// Names of the per-layer keys (the layer number is in the keycode)
export function getLayerKeyMetadata(keycode: number) {
  const layer = keycode & 0x07
  const kinds = [
    [
      Keycode.SP_TO_MIN,
      "TO",
      `Go to layer ${layer} and stay there (other layers off)`,
    ],
    [
      Keycode.SP_DF_MIN,
      "DF",
      `Make layer ${layer} the default layer (until the keyboard restarts)`,
    ],
    [
      Keycode.SP_OSL_MIN,
      "OSL",
      `One Shot layer ${layer}: tap, and the next key uses layer ${layer}; hold it like MO(${layer})`,
    ],
  ] as const
  for (const [min, name, tooltip] of kinds) {
    if (min <= keycode && keycode <= min + 7)
      return {
        name: `${name}(${layer})`,
        tooltip: `${tooltip}. Needs firmware v1.2 or later.`,
      }
  }
  return null
}

export function getLayersKeycodes(numLayers: number) {
  const layers = [...Array(numLayers)].map((_, i) => i)
  return [
    ...layers.map(MO),
    ...layers.map(TO),
    ...layers.map(DF),
    ...layers.map(OSL),
    Keycode.SP_LAYER_LOCK,
    // Tri Layer turns on layer 3
    ...(numLayers >= 4
      ? [Keycode.SP_TRI_LAYER_LOWER, Keycode.SP_TRI_LAYER_UPPER]
      : []),
    ...modifiers.map((_, i) => OSM(i)),
  ]
}
