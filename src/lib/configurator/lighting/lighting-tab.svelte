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

<!-- MAD60 HE fork: lighting (libhmk src/rgb.c, commands 0xE0-0xE3, 0xE7-0xEC) -->
<script lang="ts">
  import { ChevronDownIcon } from "@lucide/svelte"
  import AreaSelect from "$lib/components/area-select.svelte"
  import CommitSlider from "$lib/components/commit-slider.svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import * as KeyboardEditor from "$lib/components/keyboard-editor"
  import { KeyboardEditorKeyboard } from "$lib/components/keyboard-editor"
  import * as KeycodeButton from "$lib/components/keycode-button"
  import * as Accordion from "$lib/components/ui/accordion"
  import { Button } from "$lib/components/ui/button"
  import * as Empty from "$lib/components/ui/empty"
  import * as Popover from "$lib/components/ui/popover"
  import {
    hexToRgb,
    HMK_LAYER_INDICATOR_MODES,
    HMK_RGB_EFFECT_CUSTOM,
    HMK_RGB_EFFECT_SOLID,
    HMK_RGB_STOCK_MAX_BRIGHTNESS,
    hsvToRgb,
    rgbEffectMetadata,
    rgbToHex,
    rgbToHueSat,
    type HMK_RgbColor,
    type HMK_RgbConfig,
  } from "$lib/libhmk/rgb"
  import { cn, setToIntervals, type WithoutChildren } from "$lib/utils"
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
  const { current: whiteBalance } = $derived(rgbQuery.whiteBalance)
  // Color calibration: a test color lights every key (Solid Color at the
  // current brightness); the lighting before the first one is put back after
  const testColors = [
    ["White", "#ffffff"],
    ["Red", "#ff0000"],
    ["Green", "#00ff00"],
    ["Blue", "#0000ff"],
    ["Yellow", "#ffff00"],
    ["Cyan", "#00ffff"],
    ["Magenta", "#ff00ff"],
    ["Orange", "#ff8000"],
    ["Purple", "#8000ff"],
  ] as const
  let testColor = $state<string | null>(null)
  let beforeTest = $state<HMK_RgbConfig | null>(null)
  const { current: keymap } = $derived(keymapQueryContext.get().keymap)
  const optionsQuery = optionsQueryContext.get()
  const { current: options } = $derived(optionsQuery.options)
  const capsOff = $derived(options?.capsIndicatorDisabled ?? false)
  // One colour per layer from layer 1 (a single entry: firmware v1.2, one
  // colour for every layer and no modes)
  const { current: layerColors } = $derived(rgbQuery.layer)
  const perLayer = $derived((layerColors?.length ?? 0) > 1)
  let layerEdit = $state(1)
  const layerColor = $derived(
    layerColors?.[Math.min(layerEdit, layerColors.length) - 1],
  )
  const layerOff = $derived(options?.layerIndicatorDisabled ?? false)
  const layerMode = $derived(
    HMK_LAYER_INDICATOR_MODES[options?.layerIndicatorMode ?? 0],
  )
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

  // Effect picker: every effect at once, grouped by name (first match wins,
  // the rest are Basic)
  let effectsOpen = $state(false)
  let effectsContent = $state<HTMLElement | null>(null)

  // Open the picker at the current effect (on short screens it is below the
  // fold), focused for the keyboard
  function focusCurrentEffect(e: Event) {
    const current = effectsContent?.querySelector<HTMLElement>(
      "button[aria-pressed=true]",
    )
    if (!current) return
    e.preventDefault()
    current.focus({ preventScroll: true })
    current.scrollIntoView({ block: "center" })
  }
  const effectGroups = $derived.by(() => {
    const groups = [
      { title: "Basic", match: null },
      { title: "Bands", match: /^Band/ },
      {
        title: "Rainbows and cycles",
        match: /Cycle|Rainbow|Beacon|Riverflow|Flower/,
      },
      { title: "Rain, pixels and stars", match: /Rain|Pixel|Starlight/ },
      { title: "React to typing", match: /Reactive|splash|Heatmap/i },
    ].map((g) => ({ ...g, effects: [] as typeof rgbEffectMetadata }))
    for (const m of rgbEffectMetadata) {
      if (!rgb || m.effect >= rgb.numEffects) continue
      const group =
        groups.find((g) => g.match?.test(m.title)) ??
        groups.find((g) => g.match === null)!
      group.effects.push(m)
    }
    return groups.filter((g) => g.effects.length > 0)
  })

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
  <KeyboardEditor.Pane keyboard>
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
              <Popover.Root bind:open={effectsOpen}>
                <Popover.Trigger
                  id="rgb-effect"
                  class="flex h-9 w-72 items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm"
                >
                  {effect?.title ?? `Effect ${rgb.effect}`}
                  <ChevronDownIcon class="size-4 opacity-50" />
                </Popover.Trigger>
                <Popover.Content
                  bind:ref={effectsContent}
                  align="start"
                  class="max-h-[calc(var(--bits-popover-content-available-height)-1rem)] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto"
                  onOpenAutoFocus={focusCurrentEffect}
                >
                  {#each effectGroups as { title, effects } (title)}
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-medium text-muted-foreground">
                        {title}
                      </span>
                      <div class="grid grid-cols-2 gap-1 md:grid-cols-3">
                        {#each effects as m (m.effect)}
                          <button
                            aria-pressed={m.effect === rgb.effect}
                            class={cn(
                              "rounded-md px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground",
                              m.effect === rgb.effect &&
                                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                            )}
                            onclick={() => {
                              rgbQuery.set({
                                data: { ...rgb, effect: m.effect },
                              })
                              effectsOpen = false
                            }}
                            type="button"
                          >
                            {m.title}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </Popover.Content>
              </Popover.Root>
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
            {#if whiteBalance}
              <Accordion.Root type="single">
                <Accordion.Item class="-mx-1" value="calibration">
                  <Accordion.Trigger class="px-1 py-0"
                    >Color Calibration</Accordion.Trigger
                  >
                  <!-- Room for the buttons' focus / pressed rings: the content clips (animation) -->
                  <Accordion.Content class="flex flex-col gap-4 px-1 pt-3">
                    <div class="flex flex-col gap-2">
                      <div class="grid text-sm">
                        <span class="text-muted-foreground">
                          The LEDs are not color balanced (white can look
                          blue-green). Pick a test color to light every key in
                          it, then lower the strongest channels below until it
                          looks right. Start with White. Applies to every
                          effect.
                        </span>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        {#each testColors as [name, hex] (name)}
                          <Button
                            aria-pressed={testColor === hex}
                            class={cn(
                              testColor === hex && "ring-2 ring-primary",
                            )}
                            onclick={() => {
                              beforeTest ??= { ...rgb }
                              testColor = hex
                              const [hue, sat] = rgbToHueSat(hexToRgb(hex))
                              rgbQuery.set({
                                data: {
                                  ...rgb,
                                  effect: HMK_RGB_EFFECT_SOLID,
                                  hue,
                                  sat,
                                },
                              })
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <span
                              class="size-3 rounded-full border"
                              style={`background: ${hex}`}
                            ></span>
                            {name}
                          </Button>
                        {/each}
                      </div>
                      <div class="flex gap-2">
                        <Button
                          disabled={!beforeTest}
                          onclick={() => {
                            rgbQuery.set({ data: beforeTest! })
                            beforeTest = null
                            testColor = null
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Back to my effect
                        </Button>
                        <Button
                          disabled={whiteBalance.every((v) => v === 255)}
                          onclick={() =>
                            rgbQuery.setWhiteBalance({ data: [255, 255, 255] })}
                          size="sm"
                          variant="outline"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                    {#each ["Red", "Green", "Blue"] as title, i (title)}
                      <CommitSlider
                        bind:committed={
                          () => whiteBalance[i],
                          (v) =>
                            rgbQuery.setWhiteBalance({
                              data: whiteBalance.map((c, j) =>
                                j === i ? v : c,
                              ) as HMK_RgbColor,
                            })
                        }
                        display={(v) => (v === 255 ? "255 (full)" : String(v))}
                        min={0}
                        max={255}
                        step={1}
                        {title}
                      />
                    {/each}
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion.Root>
            {/if}
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
              <Accordion.Root type="single">
                <Accordion.Item class="-mx-1" value="caps">
                  <Accordion.Trigger class="px-1 py-0"
                    >Caps Lock Indicator</Accordion.Trigger
                  >
                  <Accordion.Content class="flex flex-col gap-4 px-1 pt-3">
                    <div class="flex flex-col gap-2">
                      <label class="grid text-sm" for="rgb-caps-color">
                        <span class="font-medium">Color</span>
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
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion.Root>
            {/if}
            {#if layerColors && layerColor}
              <Accordion.Root type="single">
                <Accordion.Item class="-mx-1" value="layer">
                  <Accordion.Trigger class="px-1 py-0"
                    >Layer Indicator</Accordion.Trigger
                  >
                  <Accordion.Content class="flex flex-col gap-4 px-1 pt-3">
                    <div class="flex flex-col gap-2">
                      <label class="grid text-sm" for="rgb-layer-color">
                        <span class="font-medium">Color</span>
                        <span class="text-muted-foreground">
                          {layerOff
                            ? "Off: turn the Layer Indicator on in Settings to use it."
                            : perLayer
                              ? "While a layer other than 0 is on (Fn held, a layer locked), the keys bound on it light in that layer's color. Pick a layer to set its color. Turn it off in Settings."
                              : "While a layer other than 0 is on (Fn held, a layer locked), the keys that do something there light in this color. Turn it off in Settings."}
                        </span>
                      </label>
                      {#if perLayer}
                        <div class="flex flex-wrap gap-2">
                          {#each layerColors as c, i (i)}
                            <Button
                              aria-pressed={layerEdit === i + 1}
                              class={cn(
                                layerEdit === i + 1 && "ring-2 ring-primary",
                              )}
                              disabled={layerOff}
                              onclick={() => (layerEdit = i + 1)}
                              size="sm"
                              variant="outline"
                            >
                              <span
                                class="size-3 rounded-full border"
                                style:background-color={rgbToHex(
                                  hsvToRgb(c.hue, c.sat, 255),
                                )}
                              ></span>
                              Layer {i + 1}
                            </Button>
                          {/each}
                        </div>
                      {/if}
                      <input
                        id="rgb-layer-color"
                        class="h-9 w-24 cursor-pointer rounded-md border disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={layerOff}
                        type="color"
                        value={rgbToHex(
                          hsvToRgb(layerColor.hue, layerColor.sat, 255),
                        )}
                        onchange={(e) => {
                          const [hue, sat] = rgbToHueSat(
                            hexToRgb(e.currentTarget.value),
                          )
                          rgbQuery.setLayer({
                            layer: layerEdit,
                            data: { ...layerColor, hue, sat },
                          })
                        }}
                      />
                    </div>
                    <CommitSlider
                      bind:committed={
                        () => layerColor.val,
                        (v) =>
                          rgbQuery.setLayer({
                            layer: layerEdit,
                            data: { ...layerColor, val: v },
                          })
                      }
                      description={perLayer
                        ? `Brightness of layer ${layerEdit}'s indicator, separate from the effect's.`
                        : "Brightness of the layer indicator, separate from the effect's."}
                      disabled={layerOff}
                      display={(v) =>
                        v > HMK_RGB_STOCK_MAX_BRIGHTNESS
                          ? `${v} (above stock ${HMK_RGB_STOCK_MAX_BRIGHTNESS})`
                          : String(v)}
                      min={0}
                      max={rgb.maxBrightness}
                      step={1}
                      title="Layer Indicator Brightness"
                    />
                    {#if perLayer && options}
                      <div class="flex flex-col gap-2">
                        <div class="grid text-sm">
                          <span class="font-medium">Other Keys</span>
                          <span class="text-muted-foreground">
                            While a layer is on: {layerMode.description}
                          </span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                          {#each HMK_LAYER_INDICATOR_MODES as m (m.mode)}
                            <Button
                              aria-pressed={layerMode.mode === m.mode}
                              class={cn(
                                layerMode.mode === m.mode &&
                                  "ring-2 ring-primary",
                              )}
                              disabled={layerOff}
                              onclick={() =>
                                optionsQuery.set({
                                  data: {
                                    ...options,
                                    layerIndicatorMode: m.mode,
                                  },
                                })}
                              size="sm"
                              variant="outline"
                            >
                              {m.title}
                            </Button>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion.Root>
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
