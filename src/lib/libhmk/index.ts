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

import { uint16Schema } from "$lib/integer"
import z from "zod"

export const HMK_FIRMWARE_MIN_VERSION = 0x0104
export const HMK_FIRMWARE_MAX_VERSION = 0x0108
export const featureVersionMap = {
  pollingRateSwitch: 0x0105,
  saveCalibrationThreshold: 0x0107,
  numDynamicKeystrokeMaxBindings: 0x0108,
  advancedKeyMacro: 0x0108,
} as const
export type Feature = keyof typeof featureVersionMap

export const HMK_DEVICE_USAGE_PAGE = 0xffab
export const HMK_DEVICE_USAGE_ID = 0xab

export const HMK_MAX_NUM_PROFILES = 8
export const HMK_MAX_NUM_LAYERS = 8
export const HMK_MAX_NUM_KEYS = 256
export const HMK_MAX_NUM_ADVANCED_KEYS = 64
export const HMK_MAX_NUM_DYNAMIC_KEYSTROKE_MAX_BINDINGS = 64
export const HMK_MAX_NUM_MACRO_NODES = 255

export const HMK_MIN_DISTANCE = 4
export const HMK_MAX_DISTANCE = 255

export const hmkCalibrationSchema = z.object({
  initialRestValue: uint16Schema,
  initialBottomOutThreshold: uint16Schema,
})

export type HMK_Calibration = z.infer<typeof hmkCalibrationSchema>

export const hmkOptionsSchema = z.object({
  xInputEnabled: z.boolean(),
  saveBottomOutThreshold: z.boolean(),
  highPollingRateEnabled: z.boolean(),
  // MAD60 HE fork: stock switches (firmware option bits 3-5)
  wasdSwapEnabled: z.boolean(),
  guiLockEnabled: z.boolean(),
  nkroDisabled: z.boolean(),
  // MAD60 HE fork v1.1: Mac mode (Alt / GUI swapped, bit 6) and the Caps Lock
  // indicator (bit 7, stored inverted: set = indicator off)
  macModeEnabled: z.boolean(),
  capsIndicatorDisabled: z.boolean(),
  // MAD60 HE fork v1.2: layer indicator (bit 8, stored inverted)
  layerIndicatorDisabled: z.boolean(),
  // MAD60 HE fork v1.3: what the layer indicator does with the other keys
  // (bits 9-10, HMK_LAYER_INDICATOR_MODES)
  layerIndicatorMode: z.int().min(0).max(3),
  // MAD60 HE fork v1.5: both Shifts together turn on Caps Word (bit 11)
  capsWordBothShifts: z.boolean(),
})

export type HMK_Options = z.infer<typeof hmkOptionsSchema>
