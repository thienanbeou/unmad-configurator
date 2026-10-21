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

import { keyboardContext, type HMK_InUse } from "$lib/keyboard"
import { Context, resource, type ResourceReturn } from "runed"
import { optimisticUpdate } from "."

// MAD60 HE fork: profiles and layers in use. `current` falls back to every
// profile and layer on firmware without the setting; `max` is what fits.
export class InUseQuery {
  inUse: ResourceReturn<HMK_InUse | null>
  readonly max: HMK_InUse

  #keyboard = keyboardContext.get()

  constructor() {
    const { numProfiles, numLayers } = this.#keyboard.metadata
    this.max = { profiles: numProfiles, layers: numLayers }
    this.inUse = resource(
      () => {},
      () => this.#keyboard.getInUse(),
    )
  }

  get current(): HMK_InUse {
    return this.inUse.current ?? this.max
  }

  // Whether the add buttons show (the firmware has the setting)
  get adjustable() {
    return !!this.inUse.current
  }

  async add(what: keyof HMK_InUse) {
    const current = this.inUse.current
    if (!current || current[what] >= this.max[what]) return
    const data = { ...current, [what]: current[what] + 1 }
    await optimisticUpdate({
      resource: this.inUse,
      optimisticFn: () => data,
      updateFn: () => this.#keyboard.setInUse({ data }),
    })
  }
}

export const inUseQueryContext = new Context<InUseQuery>("hmk-in-use-query")
