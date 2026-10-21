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

import { uint8Schema, uint16Schema } from "$lib/integer"
import z from "zod"

export enum HMK_Command {
  FIRMWARE_VERSION = 0,
  REBOOT,
  BOOTLOADER,
  FACTORY_RESET,
  RECALIBRATE,
  ANALOG_INFO,
  GET_CALIBRATION,
  SET_CALIBRATION,
  GET_PROFILE,
  GET_OPTIONS,
  SET_OPTIONS,
  RESET_PROFILE,
  DUPLICATE_PROFILE,
  GET_METADATA,
  GET_SERIAL,
  SAVE_CALIBRATION_THRESHOLD,

  GET_KEYMAP = 128,
  SET_KEYMAP,
  GET_ACTUATION_MAP,
  SET_ACTUATION_MAP,
  GET_ADVANCED_KEYS,
  SET_ADVANCED_KEYS,
  GET_TICK_RATE,
  SET_TICK_RATE,
  GET_GAMEPAD_BUTTONS,
  SET_GAMEPAD_BUTTONS,
  GET_GAMEPAD_OPTIONS,
  SET_GAMEPAD_OPTIONS,
  GET_MACROS,
  SET_MACROS,

  // MAD60 HE fork: lighting (libhmk src/rgb.c)
  GET_RGB = 0xe0,
  SET_RGB,
  GET_RGB_KEY_COLORS,
  SET_RGB_KEY_COLORS,
  READ_MEMORY,
  STAGE_BOOTLOADER,
  INSTALL_BOOTLOADER,
  GET_RGB_CAPS,
  SET_RGB_CAPS,
  GET_RGB_WHITE_BALANCE,
  SET_RGB_WHITE_BALANCE,
  GET_RGB_LAYER,
  SET_RGB_LAYER,
  GET_IN_USE,
  SET_IN_USE,
  GET_RGB_IDLE,
  SET_RGB_IDLE,

  UNKNOWN = 255,
}

export const HMK_RAW_HID_EP_SIZE = 64

export const hmkAnalogInfoSchema = z.object({
  adcValue: uint16Schema,
  distance: uint8Schema,
})

export type HMK_AnalogInfo = z.infer<typeof hmkAnalogInfoSchema>
