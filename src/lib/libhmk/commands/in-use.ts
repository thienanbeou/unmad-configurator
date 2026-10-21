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

import type { HMK_InUse, SetInUseParams } from "$lib/keyboard"
import type { Commander } from "$lib/keyboard/commander"
import { HMK_Command } from "."

/**
 * Profiles and layers in use (MAD60 HE fork, firmware v1.4), or null when the
 * firmware does not have them (every profile and layer is then in use)
 */
export async function getInUse(
  commander: Commander,
): Promise<HMK_InUse | null> {
  let view: DataView
  try {
    view = await commander.sendCommand({
      command: HMK_Command.GET_IN_USE,
      timeout: 1000,
    })
  } catch {
    return null
  }
  return { profiles: view.getUint8(0), layers: view.getUint8(1) }
}

export async function setInUse(
  commander: Commander,
  { data: { profiles, layers } }: SetInUseParams,
) {
  await commander.sendCommand({
    command: HMK_Command.SET_IN_USE,
    payload: [profiles, layers],
  })
}
