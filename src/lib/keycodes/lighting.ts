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

import { Keycode } from "$lib/libhmk/keycodes"
import type { KeycodeMetadata } from "."

// MAD60 HE fork v1.5: QMK RGB keys. With Shift held each goes the other way.
const NOTE = " Hold Shift for the other way. Needs firmware v1.5 or later."

export const lightingKeycodeMetadata: KeycodeMetadata[] = [
  [
    "RGB\nToggle",
    "Lighting off, or back on with the effect it had.",
    Keycode.SP_RGB_TOGGLE,
  ],
  ["RGB\nNext", "Next lighting effect.", Keycode.SP_RGB_NEXT],
  ["RGB\nPrev", "Previous lighting effect.", Keycode.SP_RGB_PREV],
  ["Hue\nUp", "Color hue up.", Keycode.SP_RGB_HUE_UP],
  ["Hue\nDown", "Color hue down.", Keycode.SP_RGB_HUE_DOWN],
  ["Sat\nUp", "Color saturation up.", Keycode.SP_RGB_SAT_UP],
  ["Sat\nDown", "Color saturation down.", Keycode.SP_RGB_SAT_DOWN],
  ["Bright\nUp", "Lighting brightness up.", Keycode.SP_RGB_VAL_UP],
  ["Bright\nDown", "Lighting brightness down.", Keycode.SP_RGB_VAL_DOWN],
  ["Speed\nUp", "Effect speed up.", Keycode.SP_RGB_SPEED_UP],
  ["Speed\nDown", "Effect speed down.", Keycode.SP_RGB_SPEED_DOWN],
].map(([name, tooltip, keycode]) => ({
  name: name as string,
  tooltip: (tooltip as string) + NOTE,
  keycode: keycode as Keycode,
  webCodes: [],
  category: "Lighting" as const,
}))

export const lightingKeycodes = lightingKeycodeMetadata.map((m) => m.keycode)
