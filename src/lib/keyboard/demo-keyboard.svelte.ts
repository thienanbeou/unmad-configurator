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

import { analogCurvePresets } from "$lib/configurator/lib/gamepad"
import { HMK_FIRMWARE_MAX_VERSION, type HMK_Options } from "$lib/libhmk"
import { defaultActuation, type HMK_Actuation } from "$lib/libhmk/actuation"
import {
  DEFAULT_TICK_RATE,
  defaultAdvancedKey,
  type HMK_AdvancedKey,
} from "$lib/libhmk/advanced-keys"
import { HMK_GamepadButton, type HMK_GamepadOptions } from "$lib/libhmk/gamepad"
import { defaultMacroNode, type HMK_MacroNode } from "$lib/libhmk/macro"
import type { HMK_RgbCaps, HMK_RgbColor, HMK_RgbConfig } from "$lib/libhmk/rgb"
import type {
  DuplicateProfileParams,
  GetActuationMapParams,
  GetAdvancedKeysParams,
  GetGamepadButtonsParams,
  GetGamepadOptionsParams,
  GetKeymapParams,
  GetMacrosParams,
  GetTickRateParams,
  Keyboard,
  ResetProfileParams,
  SetActuationMapParams,
  SetAdvancedKeysParams,
  SetGamepadButtonsParams,
  SetGamepadOptionsParams,
  SetKeymapParams,
  SetMacrosParams,
  SetOptionsParams,
  SetRgbCapsParams,
  SetRgbKeyColorsParams,
  SetRgbParams,
  SetRgbWhiteBalanceParams,
  SetRgbLayerParams,
  SetTickRateParams,
} from "."
import { demoMetadata } from "./metadata"

const {
  adcResolution,
  numProfiles,
  numKeys,
  numAdvancedKeys,
  numMacroNodes,
  defaultKeymaps,
} = demoMetadata

type DemoKeyboardProfileState = {
  keymap: number[][]
  actuationMap: HMK_Actuation[]
  advancedKeys: HMK_AdvancedKey[]
  macros: HMK_MacroNode[]
  gamepadButtons: number[]
  gamepadOptions: HMK_GamepadOptions
  tickRate: number
}

function defaultProfile(profile: number): DemoKeyboardProfileState {
  return {
    keymap: defaultKeymaps[profile],
    actuationMap: Array(numKeys).fill(defaultActuation),
    advancedKeys: Array(numAdvancedKeys).fill(defaultAdvancedKey),
    macros: Array(numMacroNodes).fill(defaultMacroNode),
    gamepadButtons: Array(numKeys).fill(HMK_GamepadButton.NONE),
    gamepadOptions: {
      analogCurve: analogCurvePresets[0].curve,
      keyboardEnabled: true,
      gamepadOverride: false,
      squareJoystick: false,
      snappyJoystick: true,
    },
    tickRate: DEFAULT_TICK_RATE,
  }
}

type DemoKeyboardState = {
  options: HMK_Options
  profiles: DemoKeyboardProfileState[]
  rgb: HMK_RgbConfig
  rgbKeyColors: HMK_RgbColor[]
  rgbCaps: HMK_RgbCaps
  rgbWhiteBalance: HMK_RgbColor
  rgbLayer: HMK_RgbCaps
}

export class DemoKeyboard implements Keyboard {
  id = "demo"
  demo = true
  version = HMK_FIRMWARE_MAX_VERSION
  metadata = demoMetadata

  #state: DemoKeyboardState = {
    options: {
      xInputEnabled: true,
      saveBottomOutThreshold: true,
      highPollingRateEnabled: true,
      wasdSwapEnabled: false,
      guiLockEnabled: false,
      nkroDisabled: false,
      macModeEnabled: false,
      capsIndicatorDisabled: false,
      layerIndicatorDisabled: false,
    },
    profiles: [...Array(numProfiles)].map((_, i) =>
      structuredClone(defaultProfile(i)),
    ),
    // MAD60 HE fork defaults (Rainbow Pinwheels)
    rgb: { effect: 13, hue: 0, sat: 255, val: 210, speed: 70, hueRange: 255 },
    rgbKeyColors: [...Array(numKeys)].map((): HMK_RgbColor => [0, 0, 0]),
    rgbCaps: { hue: 0, sat: 0, val: 210 },
    rgbWhiteBalance: [255, 255, 255],
    rgbLayer: { hue: 170, sat: 255, val: 210 },
  }

  async disconnect() {}
  async forget() {}

  async reboot() {}
  async bootloader() {}
  async factoryReset() {}
  async recalibrate() {}
  async analogInfo() {
    return Array(numKeys).fill({ adcValue: 0, distance: 0 })
  }
  async getCalibration() {
    return {
      initialRestValue: (1 << adcResolution) - 1,
      initialBottomOutThreshold: (1 << adcResolution) - 1,
    }
  }
  async setCalibration() {}
  async getProfile() {
    return 0
  }
  async getOptions() {
    return this.#state.options
  }
  async setOptions({ data }: SetOptionsParams) {
    this.#state.options = data
  }
  async resetProfile({ profile }: ResetProfileParams) {
    this.#state.profiles[profile] = structuredClone(defaultProfile(profile))
  }
  async duplicateProfile({ profile, srcProfile }: DuplicateProfileParams) {
    this.#state.profiles[profile] = structuredClone(
      this.#state.profiles[srcProfile],
    )
  }
  async saveCalibrationThreshold() {
    return
  }

  async getKeymap({ profile }: GetKeymapParams) {
    return this.#state.profiles[profile].keymap
  }
  async setKeymap({ profile, layer, offset, data }: SetKeymapParams) {
    for (let i = 0; i < data.length; i++) {
      this.#state.profiles[profile].keymap[layer][offset + i] = data[i]
    }
  }
  async getActuationMap({ profile }: GetActuationMapParams) {
    return this.#state.profiles[profile].actuationMap
  }
  async setActuationMap({ profile, offset, data }: SetActuationMapParams) {
    for (let i = 0; i < data.length; i++) {
      this.#state.profiles[profile].actuationMap[offset + i] = data[i]
    }
  }
  async getAdvancedKeys({ profile }: GetAdvancedKeysParams) {
    return this.#state.profiles[profile].advancedKeys
  }
  async setAdvancedKeys({ profile, offset, data }: SetAdvancedKeysParams) {
    for (let i = 0; i < data.length; i++) {
      this.#state.profiles[profile].advancedKeys[offset + i] = data[i]
    }
  }
  async getGamepadButtons(params: GetGamepadButtonsParams): Promise<number[]> {
    return this.#state.profiles[params.profile].gamepadButtons
  }
  async setGamepadButtons({ profile, offset, data }: SetGamepadButtonsParams) {
    for (let i = 0; i < data.length; i++) {
      this.#state.profiles[profile].gamepadButtons[offset + i] = data[i]
    }
  }
  async getGamepadOptions({ profile }: GetGamepadOptionsParams) {
    return this.#state.profiles[profile].gamepadOptions
  }
  async setGamepadOptions({ profile, data }: SetGamepadOptionsParams) {
    this.#state.profiles[profile].gamepadOptions = data
  }
  async getTickRate({ profile }: GetTickRateParams) {
    return this.#state.profiles[profile].tickRate
  }
  async setTickRate({ profile, data }: SetTickRateParams) {
    this.#state.profiles[profile].tickRate = data
  }
  async getMacros({ profile }: GetMacrosParams) {
    return this.#state.profiles[profile].macros
  }
  async setMacros({ profile, offset, data }: SetMacrosParams) {
    for (let i = 0; i < data.length; i++) {
      this.#state.profiles[profile].macros[offset + i] = data[i]
    }
  }
  async getRgb() {
    return { ...this.#state.rgb, numEffects: 52, maxBrightness: 255 }
  }
  async setRgb({ data }: SetRgbParams) {
    this.#state.rgb = data
  }
  async getRgbKeyColors() {
    return structuredClone(this.#state.rgbKeyColors)
  }
  async getRgbCaps() {
    return { ...this.#state.rgbCaps }
  }
  async setRgbCaps({ data }: SetRgbCapsParams) {
    this.#state.rgbCaps = data
  }
  async getRgbWhiteBalance(): Promise<HMK_RgbColor> {
    return [...this.#state.rgbWhiteBalance]
  }
  async setRgbWhiteBalance({ data }: SetRgbWhiteBalanceParams) {
    this.#state.rgbWhiteBalance = data
  }
  async getRgbLayer() {
    return { ...this.#state.rgbLayer }
  }
  async setRgbLayer({ data }: SetRgbLayerParams) {
    this.#state.rgbLayer = data
  }
  async setRgbKeyColors({ offset, data }: SetRgbKeyColorsParams) {
    for (let i = 0; i < data.length; i++) {
      this.#state.rgbKeyColors[offset + i] = data[i]
    }
  }
}
