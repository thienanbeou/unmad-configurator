<!--
This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <https://www.gnu.org/licenses/>.
-->

<!-- MAD60 HE fork: lighting (libhmk src/rgb.c, commands 0xE0-0xE3, 0xE7-0xE8) -->
<script lang="ts">
  import AreaSelect from "$lib/components/area-select.svelte"
  import CommitSlider from "$lib/components/commit-slider.svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import * as KeyboardEditor from "$lib/components/keyboard-editor"
  import { KeyboardEditorKeyboard } from "$lib/components/keyboard-editor"
  import * as KeycodeButton from "$lib/components/keycode-button"
  import { Button } from "$lib/components/ui/button"
  import * as Empty from "$lib/components/ui/empty"
  import {
    hexToRgb,
    HMK_RGB_EFFECT_CUSTOM,
    HMK_RGB_STOCK_MAX_BRIGHTNESS,
    hsvToRgb,
    rgbEffectMetadata,
    rgbToHex,
    rgbToHueSat,
    type HMK_RgbColor,
  } from "$lib/libhmk/rgb"
  import { setToIntervals, type WithoutChildren } from "$lib/utils"
  import { ToggleGroup } from "bits-ui"
  import type { ComponentProps } from "svelte"
  import { SvelteSet } from "svelte/reactivity"
  import { displayLayoutContext } from "../context.svelte"
  import { keymapQueryContext } from "../queries/keymap-query.svelte"
  import { optionsQueryContext } from "../queries/options-query.svelte"
  import { rgbQueryContext } from "../queries/rgb-query.svelte"

  const {
    ...props
  }: WithoutChildren<ComponentProps<typeof KeyboardEditor.Root>> = $props()

  const rgbQuery = rgbQueryContext.get()
  const { current: rgb } = $derived(rgbQuery.rgb)
  const { current: keyColors } = $derived(rgbQuery.keyColors)
  const { current: caps } = $derived(rgbQuery.caps)
  const { current: keymap } = $derived(keymapQueryContext.get().keymap)
  const { current: options } = $derived(optionsQueryContext.get().options)
  const capsOff = $derived(options?.capsIndicatorDisabled ?? false)
  const allKeys = $derived(
    displayLayoutContext.get().displayKeys.map(({ key }) => key),
  )

  const keys = new SvelteSet<number>()
  let keyColor = $state("#2e6fc3")
  let isDragging = $state(false)

  const effect = $derived(
    rgb ? rgbEffectMetadata.find((m) => m.effect === rgb.effect) : undefined,
  )
  const custom = $derived(rgb?.effect === HMK_RGB_EFFECT_CUSTOM)
  const baseColor = $derived(
    rgb ? rgbToHex(hsvToRgb(rgb.hue, rgb.sat, 255)) : "#000000",
  )

  function setKeyColors(color: HMK_RgbColor) {
    return Promise.all(
      setToIntervals(keys).map(([offset, len]) =>
        rgbQuery.setKeyColors({ offset, data: Array(len).fill(color) }),
      ),
    )
  }
</script>

<svelte:document onmouseup={() => (isDragging = false)} />

<KeyboardEditor.Root {...props}>
  <KeyboardEditor.Pane>
    <ToggleGroup.Root
      bind:value={() => [...keys].map(String), () => {}}
      type="multiple"
    >
      {#snippet child({ props })}
        <AreaSelect
          bind:selections={
            () => keys,
            (v) => {
              keys.clear()
              v.forEach((k) => keys.add(k))
            }
          }
          class="flex flex-1 flex-col"
          {...props}
        >
          <KeyboardEditorKeyboard {...props}>
            {#snippet keyGenerator(key)}
              {#if !keymap}
                <KeycodeButton.Skeleton />
              {:else}
                <ToggleGroup.Item
                  data-selectable
                  data-selectable-index={key}
                  disabled={!custom}
                  onmousedown={(e) => {
                    if (!custom) return
                    e.stopPropagation()
                    isDragging = true
                    if (keys.has(key)) keys.delete(key)
                    else keys.add(key)
                  }}
                  onmouseenter={(e) => {
                    e.stopPropagation()
                    if (isDragging && custom) keys.add(key)
                  }}
                  value={String(key)}
                >
                  {#snippet child({ props })}
                    <KeycodeButton.Root
                      keycode={keymap[0][key]}
                      style={custom && keyColors?.[key]
                        ? `box-shadow: inset 0 -0.45em 0 ${rgbToHex(keyColors[key])}`
                        : undefined}
                      {...props}
                    />
                  {/snippet}
                </ToggleGroup.Item>
              {/if}
            {/snippet}
          </KeyboardEditorKeyboard>
        </AreaSelect>
      {/snippet}
    </ToggleGroup.Root>
    <KeyboardEditor.Menubar>
      <div class="flex items-center gap-2">
        <Button
          disabled={!custom || allKeys.every((key) => keys.has(key))}
          onclick={() => allKeys.forEach((key) => keys.add(key))}
          size="sm"
          variant="outline"
        >
          Select All
        </Button>
        <Button
          disabled={!custom || keys.size === 0}
          onclick={() => keys.clear()}
          size="sm"
          variant="outline"
        >
          Deselect All
        </Button>
      </div>
    </KeyboardEditor.Menubar>
  </KeyboardEditor.Pane>
  <KeyboardEditor.Handle />
  <KeyboardEditor.Pane>
    <KeyboardEditor.Container>
      {#if rgb === null}
        <Empty.Root class="m-4 border border-dashed">
          <Empty.Header>
            <Empty.Description>
              This firmware has no lighting control (it needs the MAD60 HE fork
              of libhmk).
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {:else if rgb !== undefined}
        <div class="grid size-full grid-cols-[minmax(0,1fr)_24rem]">
          <FixedScrollArea class="flex flex-col gap-4 p-4">
            <div class="flex flex-col gap-2">
              <label class="grid text-sm" for="rgb-effect">
                <span class="font-medium">Effect</span>
                <span class="text-muted-foreground">
                  QMK RGB Matrix effects.
                </span>
              </label>
              <select
                id="rgb-effect"
                class="h-9 w-72 rounded-md border bg-background px-2 text-sm"
                value={String(rgb.effect)}
                onchange={(e) =>
                  rgbQuery.set({
                    data: { ...rgb, effect: Number(e.currentTarget.value) },
                  })}
              >
                {#each rgbEffectMetadata.filter((m) => m.effect < rgb.numEffects) as { effect, title } (effect)}
                  <option value={String(effect)}>{title}</option>
                {/each}
              </select>
            </div>
            <CommitSlider
              bind:committed={
                () => rgb.val, (v) => rgbQuery.set({ data: { ...rgb, val: v } })
              }
              description={`The stock firmware never went above ${HMK_RGB_STOCK_MAX_BRIGHTNESS}; that is the recommended maximum. Higher values draw more USB power.`}
              display={(v) =>
                v > HMK_RGB_STOCK_MAX_BRIGHTNESS
                  ? `${v} (above stock ${HMK_RGB_STOCK_MAX_BRIGHTNESS})`
                  : String(v)}
              min={0}
              max={rgb.maxBrightness}
              step={1}
              title="Brightness"
            />
            <CommitSlider
              bind:committed={
                () => rgb.speed,
                (v) => rgbQuery.set({ data: { ...rgb, speed: v } })
              }
              description={effect?.speed
                ? (effect.speedHint ?? "Animation speed.")
                : "This effect does not use the speed."}
              disabled={!effect?.speed}
              min={0}
              max={255}
              step={1}
              title="Speed"
            />
          </FixedScrollArea>
          <FixedScrollArea class="flex flex-col gap-4 border-l p-4">
            <div class="flex flex-col gap-2">
              <label class="grid text-sm" for="rgb-color">
                <span class="font-medium">Color</span>
                <span class="text-muted-foreground">
                  {effect?.range
                    ? "Center of the color range below (hue and saturation)."
                    : effect?.color
                      ? "Base color of the effect (hue and saturation)."
                      : custom
                        ? "Not used: each key has its own color, set below."
                        : "This effect makes its own colors."}
                </span>
              </label>
              <input
                id="rgb-color"
                class="h-9 w-24 cursor-pointer rounded-md border disabled:opacity-50"
                disabled={!effect?.color}
                type="color"
                value={baseColor}
                onchange={(e) => {
                  const [hue, sat] = rgbToHueSat(
                    hexToRgb(e.currentTarget.value),
                  )
                  rgbQuery.set({ data: { ...rgb, hue, sat } })
                }}
              />
            </div>
            <CommitSlider
              bind:committed={
                () => rgb.hueRange,
                (v) => rgbQuery.set({ data: { ...rgb, hueRange: v } })
              }
              description={effect?.range
                ? "Full = the whole rainbow (stock look). Lower keeps the colors in a band around the color above, so they still go together."
                : "Only for the rainbow effects."}
              disabled={!effect?.range}
              display={(v) => (v === 255 ? "Full rainbow" : String(v))}
              min={0}
              max={255}
              step={1}
              title="Color range"
            />
            {#if caps}
              <div class="flex flex-col gap-2">
                <label class="grid text-sm" for="rgb-caps-color">
                  <span class="font-medium">Caps Lock Indicator</span>
                  <span class="text-muted-foreground">
                    {capsOff
                      ? "Off: turn the Caps Lock Indicator on in Settings to use it."
                      : "Color of the Caps Lock key while Caps Lock is on, over any effect. Turn the indicator off in Settings."}
                  </span>
                </label>
                <input
                  id="rgb-caps-color"
                  class="h-9 w-24 cursor-pointer rounded-md border disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={capsOff}
                  type="color"
                  value={rgbToHex(hsvToRgb(caps.hue, caps.sat, 255))}
                  onchange={(e) => {
                    const [hue, sat] = rgbToHueSat(
                      hexToRgb(e.currentTarget.value),
                    )
                    rgbQuery.setCaps({ data: { ...caps, hue, sat } })
                  }}
                />
              </div>
              <CommitSlider
                bind:committed={
                  () => caps.val,
                  (v) => rgbQuery.setCaps({ data: { ...caps, val: v } })
                }
                description="Brightness of the Caps Lock indicator, separate from the effect's."
                disabled={capsOff}
                display={(v) =>
                  v > HMK_RGB_STOCK_MAX_BRIGHTNESS
                    ? `${v} (above stock ${HMK_RGB_STOCK_MAX_BRIGHTNESS})`
                    : String(v)}
                min={0}
                max={rgb.maxBrightness}
                step={1}
                title="Caps Lock Brightness"
              />
            {/if}
            {#if custom}
              <div class="flex flex-col gap-2">
                <div class="grid text-sm">
                  <span class="font-medium">Key Colors</span>
                  <span class="text-muted-foreground">
                    Select keys on the keyboard, pick a color and apply it.
                    {keys.size} selected.
                  </span>
                </div>
                <input
                  class="h-9 w-24 cursor-pointer rounded-md border"
                  type="color"
                  bind:value={keyColor}
                />
                <div class="flex gap-2">
                  <Button
                    disabled={keys.size === 0}
                    onclick={() => setKeyColors(hexToRgb(keyColor))}
                    size="sm"
                    variant="outline"
                  >
                    Apply Color
                  </Button>
                  <Button
                    disabled={keys.size === 0}
                    onclick={() => setKeyColors([0, 0, 0])}
                    size="sm"
                    variant="outline"
                  >
                    Turn Off
                  </Button>
                </div>
              </div>
            {/if}
          </FixedScrollArea>
        </div>
      {/if}
    </KeyboardEditor.Container>
  </KeyboardEditor.Pane>
</KeyboardEditor.Root>
