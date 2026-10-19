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

// Lighting in the MAD60 HE fork of libhmk (src/rgb.c). Effects are QMK RGB
// Matrix ports; the numbers are stored by the firmware (rgb_effect_t).

export type HMK_RgbConfig = {
  effect: number
  // QMK HSV, 0-255 each; `val` is the brightness
  hue: number
  sat: number
  val: number
  speed: number
  // Colour range of the rainbow effects: 255 = the whole colour wheel (the
  // QMK look), less = a band that wide around the base hue
  hueRange: number
}

export type HMK_RgbInfo = HMK_RgbConfig & {
  numEffects: number
  maxBrightness: number
}

// [r, g, b]
export type HMK_RgbColor = [number, number, number]

// Caps Lock indicator colour in QMK HSV (firmware v1.1 and later)
export type HMK_RgbCaps = { hue: number; sat: number; val: number }

// The stock MAD60 HE firmware never went above this brightness
export const HMK_RGB_STOCK_MAX_BRIGHTNESS = 210

export const HMK_RGB_EFFECT_CUSTOM = 1
export const HMK_RGB_EFFECT_SOLID = 2

export type RgbEffectMetadata = {
  effect: number
  title: string
  // Whether the base colour (hue / saturation) changes the effect
  color: boolean
  // Whether the speed changes the effect
  speed: boolean
  // What the speed does, if not the animation speed
  speedHint?: string
  // Whether the colour range changes the effect (the rainbow effects)
  range?: boolean
}

// QMK names (user's choice, 2026-10-18), in firmware order
export const rgbEffectMetadata: RgbEffectMetadata[] = [
  { effect: 0, title: "Off", color: false, speed: false },
  { effect: 1, title: "Custom (per-key colors)", color: false, speed: false },
  { effect: 2, title: "Solid Color", color: true, speed: false },
  { effect: 3, title: "Alphas Mods", color: true, speed: true },
  { effect: 4, title: "Gradient Up Down", color: true, speed: true },
  { effect: 5, title: "Gradient Left Right", color: true, speed: true },
  { effect: 6, title: "Breathing", color: true, speed: true },
  { effect: 7, title: "Band Saturation", color: true, speed: true },
  { effect: 8, title: "Band Value", color: true, speed: true },
  { effect: 9, title: "Band Pinwheel Saturation", color: true, speed: true },
  { effect: 10, title: "Band Spiral Saturation", color: true, speed: true },
  { effect: 11, title: "Cycle All", color: true, speed: true, range: true },
  {
    effect: 12,
    title: "Cycle Pinwheel",
    color: true,
    speed: true,
    range: true,
  },
  {
    effect: 13,
    title: "Rainbow Pinwheels",
    color: true,
    speed: true,
    range: true,
  },
  {
    effect: 14,
    title: "Jellybean Raindrops",
    color: true,
    speed: true,
    range: true,
  },
  { effect: 15, title: "Hue Breathing", color: true, speed: true },
  { effect: 16, title: "Hue Wave", color: true, speed: true },
  { effect: 17, title: "Digital Rain", color: true, speed: false },
  {
    effect: 18,
    title: "Solid Reactive Simple",
    color: true,
    speed: true,
    range: true,
  },
  {
    effect: 19,
    title: "Solid Reactive Multicross",
    color: true,
    speed: true,
    range: true,
  },
  { effect: 20, title: "Splash", color: true, speed: true, range: true },
  // Firmware v1.1: the rest of QMK's effects
  { effect: 21, title: "Band Pinwheel Value", color: true, speed: true },
  { effect: 22, title: "Band Spiral Value", color: true, speed: true },
  {
    effect: 23,
    title: "Cycle Left Right",
    color: true,
    speed: true,
    range: true,
  },
  { effect: 24, title: "Cycle Up Down", color: true, speed: true, range: true },
  {
    effect: 25,
    title: "Rainbow Moving Chevron",
    color: true,
    speed: true,
    range: true,
  },
  { effect: 26, title: "Cycle Out In", color: true, speed: true, range: true },
  {
    effect: 27,
    title: "Cycle Out In Dual",
    color: true,
    speed: true,
    range: true,
  },
  { effect: 28, title: "Cycle Spiral", color: true, speed: true, range: true },
  { effect: 29, title: "Dual Beacon", color: true, speed: true, range: true },
  {
    effect: 30,
    title: "Rainbow Beacon",
    color: true,
    speed: true,
    range: true,
  },
  { effect: 31, title: "Raindrops", color: true, speed: true },
  { effect: 32, title: "Hue Pendulum", color: true, speed: true },
  { effect: 33, title: "Pixel Fractal", color: true, speed: true },
  { effect: 34, title: "Pixel Flow", color: true, speed: true, range: true },
  { effect: 35, title: "Pixel Rain", color: true, speed: true, range: true },
  // Heat sets the hue (blue -> red); the colour only changes the saturation
  {
    effect: 36,
    title: "Typing Heatmap",
    color: false,
    speed: true,
    speedHint:
      "How fast the keys fade after typing (127 = the QMK default, lower fades slower). Needs firmware v1.2 or later.",
  },
  {
    effect: 37,
    title: "Solid Reactive",
    color: true,
    speed: true,
    range: true,
  },
  {
    effect: 38,
    title: "Solid Reactive Wide",
    color: true,
    speed: true,
    range: true,
  },
  {
    effect: 39,
    title: "Solid Reactive Multiwide",
    color: true,
    speed: true,
    range: true,
  },
  {
    effect: 40,
    title: "Solid Reactive Cross",
    color: true,
    speed: true,
    range: true,
  },
  { effect: 41, title: "Solid Reactive Nexus", color: true, speed: true },
  { effect: 42, title: "Solid Reactive Multinexus", color: true, speed: true },
  { effect: 43, title: "Multisplash", color: true, speed: true, range: true },
  { effect: 44, title: "Solid Splash", color: true, speed: true },
  { effect: 45, title: "Solid Multisplash", color: true, speed: true },
  { effect: 46, title: "Starlight", color: true, speed: true },
  { effect: 47, title: "Starlight Smooth", color: true, speed: true },
  { effect: 48, title: "Starlight Dual Hue", color: true, speed: true },
  { effect: 49, title: "Starlight Dual Saturation", color: true, speed: true },
  { effect: 50, title: "Riverflow", color: true, speed: true },
  {
    effect: 51,
    title: "Flower Blooming",
    color: true,
    speed: true,
    range: true,
  },
]

/**
 * QMK HSV (0-255 each) to RGB, the same math as the firmware's hsv_to_rgb
 */
export function hsvToRgb(h: number, s: number, v: number): HMK_RgbColor {
  if (s === 0) return [v, v, v]

  const region = Math.floor((h * 6) / 255)
  const remainder = ((h * 2 - region * 85) * 3) & 0xff
  const p = (v * (255 - s)) >> 8
  const q = (v * (255 - ((s * remainder) >> 8))) >> 8
  const t = (v * (255 - ((s * (255 - remainder)) >> 8))) >> 8

  switch (region) {
    case 6:
    case 0:
      return [v, t, p]
    case 1:
      return [q, v, p]
    case 2:
      return [p, v, t]
    case 3:
      return [p, q, v]
    case 4:
      return [t, p, v]
    default:
      return [v, p, q]
  }
}

/**
 * RGB to QMK hue and saturation (0-255); brightness is kept separately
 */
export function rgbToHueSat([r, g, b]: HMK_RgbColor): [number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (max === 0 || delta === 0) return [0, 0]

  let h: number
  if (max === r) h = ((g - b) / delta + 6) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  return [Math.round((h / 6) * 255) & 0xff, Math.round((delta / max) * 255)]
}

export function rgbToHex([r, g, b]: HMK_RgbColor) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")
}

export function hexToRgb(hex: string): HMK_RgbColor {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
