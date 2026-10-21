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
import { advancedKeysQueryContext } from "./advanced-keys-query.svelte"
import { keymapQueryContext } from "./keymap-query.svelte"
import { profileQueryContext } from "./profile-query.svelte"

// MAD60 HE fork: profiles and layers in use. `current` falls back to every
// profile and layer on firmware without the setting; `max` is what fits.
export class InUseQuery {
  inUse: ResourceReturn<HMK_InUse | null>
  readonly max: HMK_InUse

  #keyboard = keyboardContext.get()
  #keymap = keymapQueryContext.get()
  #advancedKeys = advancedKeysQueryContext.get()
  #profile = profileQueryContext.get()

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

  add(what: keyof HMK_InUse) {
    return this.#change(what, 1)
  }

  // Takes the last one out (never profile 0 / layer 0); the firmware clears
  // it (a profile to its defaults, a layer to transparent in every profile
  // without its advanced keys), so the keymap and advanced keys are read again
  async remove(what: keyof HMK_InUse) {
    await this.#change(what, -1)
    this.#keymap.keymap.refetch()
    this.#advancedKeys.advancedKeys.refetch()
    this.#profile.profile.refetch()
  }

  async #change(what: keyof HMK_InUse, by: number) {
    const current = this.inUse.current
    const count = (current?.[what] ?? 0) + by
    if (!current || count < 1 || count > this.max[what]) return
    const data = { ...current, [what]: count }
    await optimisticUpdate({
      resource: this.inUse,
      optimisticFn: () => data,
      updateFn: () => this.#keyboard.setInUse({ data }),
    })
  }
}

export const inUseQueryContext = new Context<InUseQuery>("hmk-in-use-query")
