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

import {
  keyboardContext,
  type SetRgbKeyColorsParams,
  type SetRgbParams,
} from "$lib/keyboard"
import type { HMK_RgbColor, HMK_RgbInfo } from "$lib/libhmk/rgb"
import { Context, resource, type ResourceReturn } from "runed"
import { optimisticUpdate } from "."

// MAD60 HE fork: lighting. `rgb.current` is null when the firmware has none.
export class RgbQuery {
  rgb: ResourceReturn<HMK_RgbInfo | null>
  keyColors: ResourceReturn<HMK_RgbColor[]>

  #keyboard = keyboardContext.get()

  constructor() {
    this.rgb = resource(
      () => {},
      () => this.#keyboard.getRgb(),
    )
    // Fetched once lighting is known to exist, not again on every change
    this.keyColors = resource(
      () => !!this.rgb.current,
      (supported) =>
        supported ? this.#keyboard.getRgbKeyColors() : Promise.resolve([]),
    )
  }

  async set(params: SetRgbParams) {
    const { data } = params
    await optimisticUpdate({
      resource: this.rgb,
      optimisticFn: (current) => (current ? { ...current, ...data } : current),
      updateFn: () => this.#keyboard.setRgb(params),
    })
  }

  async setKeyColors(params: SetRgbKeyColorsParams) {
    const { offset, data } = params
    await optimisticUpdate({
      resource: this.keyColors,
      optimisticFn: (current) => {
        const ret = [...current]
        data.forEach((color, i) => (ret[offset + i] = color))
        return ret
      },
      updateFn: () => this.#keyboard.setRgbKeyColors(params),
    })
  }
}

export const rgbQueryContext = new Context<RgbQuery>("hmk-rgb-query")
