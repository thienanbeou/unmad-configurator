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

import type {
  SetRgbCapsParams,
  SetRgbKeyColorsParams,
  SetRgbLayerParams,
  SetRgbParams,
  SetRgbWhiteBalanceParams,
} from "$lib/keyboard"
import type { Commander } from "$lib/keyboard/commander"
import { HMK_Command } from "."
import type { HMK_RgbCaps, HMK_RgbColor, HMK_RgbInfo } from "../rgb"

// Key colours per packet (63 data bytes / 3)
const KEY_COLORS_PER_PACKET = 20

/**
 * Lighting state, or null when the firmware has no lighting commands (any
 * libhmk other than the MAD60 HE fork never answers them)
 */
export async function getRgb(
  commander: Commander,
): Promise<HMK_RgbInfo | null> {
  let view: DataView
  try {
    view = await commander.sendCommand({
      command: HMK_Command.GET_RGB,
      timeout: 1000,
    })
  } catch {
    return null
  }
  return {
    effect: view.getUint8(0),
    hue: view.getUint8(1),
    sat: view.getUint8(2),
    val: view.getUint8(3),
    speed: view.getUint8(4),
    numEffects: view.getUint8(5),
    maxBrightness: view.getUint8(6),
    hueRange: view.getUint8(7),
  }
}

export async function setRgb(
  commander: Commander,
  { data: { effect, hue, sat, val, speed, hueRange } }: SetRgbParams,
) {
  await commander.sendCommand({
    command: HMK_Command.SET_RGB,
    payload: [effect, hue, sat, val, speed, hueRange],
  })
}

export async function getRgbKeyColors(
  commander: Commander,
  numKeys: number,
): Promise<HMK_RgbColor[]> {
  const ret: HMK_RgbColor[] = []
  for (let offset = 0; offset < numKeys; offset += KEY_COLORS_PER_PACKET) {
    const view = await commander.sendCommand({
      command: HMK_Command.GET_RGB_KEY_COLORS,
      payload: [offset],
    })
    const len = view.getUint8(0)
    for (let i = 0; i < len; i++)
      ret.push([
        view.getUint8(1 + i * 3),
        view.getUint8(2 + i * 3),
        view.getUint8(3 + i * 3),
      ])
  }
  return ret
}

export async function setRgbKeyColors(
  commander: Commander,
  { offset, data }: SetRgbKeyColorsParams,
) {
  for (let i = 0; i < data.length; i += KEY_COLORS_PER_PACKET) {
    const part = data.slice(i, i + KEY_COLORS_PER_PACKET)
    await commander.sendCommand({
      command: HMK_Command.SET_RGB_KEY_COLORS,
      payload: [offset + i, part.length, ...part.flat()],
    })
  }
}

/**
 * Caps Lock indicator colour, or null when the firmware cannot set it (older
 * than v1.1)
 */
export async function getRgbCaps(
  commander: Commander,
): Promise<HMK_RgbCaps | null> {
  let view: DataView
  try {
    view = await commander.sendCommand({
      command: HMK_Command.GET_RGB_CAPS,
      timeout: 1000,
    })
  } catch {
    return null
  }
  return { hue: view.getUint8(0), sat: view.getUint8(1), val: view.getUint8(2) }
}

export async function setRgbCaps(
  commander: Commander,
  { data: { hue, sat, val } }: SetRgbCapsParams,
) {
  await commander.sendCommand({
    command: HMK_Command.SET_RGB_CAPS,
    payload: [hue, sat, val],
  })
}

/**
 * White balance: R, G, B gain applied to every LED (255 = unchanged), or null
 * when the firmware cannot set it (older than v1.2)
 */
export async function getRgbWhiteBalance(
  commander: Commander,
): Promise<HMK_RgbColor | null> {
  let view: DataView
  try {
    view = await commander.sendCommand({
      command: HMK_Command.GET_RGB_WHITE_BALANCE,
      timeout: 1000,
    })
  } catch {
    return null
  }
  return [view.getUint8(0), view.getUint8(1), view.getUint8(2)]
}

export async function setRgbWhiteBalance(
  commander: Commander,
  { data }: SetRgbWhiteBalanceParams,
) {
  await commander.sendCommand({
    command: HMK_Command.SET_RGB_WHITE_BALANCE,
    payload: data,
  })
}

async function getRgbLayerColor(
  commander: Commander,
  layer: number,
): Promise<HMK_RgbCaps | null> {
  let view: DataView
  try {
    view = await commander.sendCommand({
      command: HMK_Command.GET_RGB_LAYER,
      payload: [layer],
      timeout: 1000,
    })
  } catch {
    return null
  }
  return { hue: view.getUint8(0), sat: view.getUint8(1), val: view.getUint8(2) }
}

/**
 * Layer indicator colours (QMK HSV) from layer 1 on, or null when the firmware
 * cannot set them (older than v1.2). v1.2 has one colour for every layer (and
 * no modes): it ignores the layer byte, so it answers a layer out of range,
 * which v1.3 refuses.
 */
export async function getRgbLayer(
  commander: Commander,
  numLayers: number,
): Promise<HMK_RgbCaps[] | null> {
  const first = await getRgbLayerColor(commander, 1)
  if (!first) return null
  if (await getRgbLayerColor(commander, numLayers)) return [first]
  const ret = [first]
  for (let layer = 2; layer < numLayers; layer++) {
    const color = await getRgbLayerColor(commander, layer)
    if (!color) return [first]
    ret.push(color)
  }
  return ret
}

export async function setRgbLayer(
  commander: Commander,
  { layer, data: { hue, sat, val } }: SetRgbLayerParams,
) {
  await commander.sendCommand({
    command: HMK_Command.SET_RGB_LAYER,
    payload: [hue, sat, val, layer],
  })
}
