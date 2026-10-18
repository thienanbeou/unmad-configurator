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

<script lang="ts">
  import { KeyboardEditorKeyboard } from "$lib/components/keyboard-editor"
  import * as KeycodeButton from "$lib/components/keycode-button"
  import { HMK_AKType } from "$lib/libhmk/advanced-keys"
  import { Keycode } from "$lib/libhmk/keycodes"
  import { numberNullable, stringNullable } from "$lib/utils"
  import { ToggleGroup } from "bits-ui"
  import { remapStateContext } from "../context.svelte"
  import { getAdvancedKeyMetadata } from "../lib/advanced-keys"
  import { advancedKeysQueryContext } from "../queries/advanced-keys-query.svelte"
  import { keymapQueryContext } from "../queries/keymap-query.svelte"

  const remapState = remapStateContext.get()
  const { layer, key } = $derived(remapState)

  const keymapQuery = keymapQueryContext.get()
  const { current: keymap } = $derived(keymapQuery.keymap)
  const { current: advancedKeys } = $derived(
    advancedKeysQueryContext.get().advancedKeys,
  )

  // Keys taken over by an advanced key show its icon (the firmware ignores
  // their keymap entry). Null Bind keys still send their keymap keycode.
  const advancedKeymap = $derived.by(() => {
    const map = new Map<string, Keycode>()
    for (const { layer, key, action } of advancedKeys ?? []) {
      if (
        action.type === HMK_AKType.NONE ||
        action.type === HMK_AKType.NULL_BIND
      )
        continue
      map.set(
        `${layer}:${key}`,
        getAdvancedKeyMetadata(action.type).keycodes[0],
      )
    }
    return map
  })
</script>

<ToggleGroup.Root
  bind:value={
    () => stringNullable(key), (v) => (remapState.key = numberNullable(v))
  }
  type="single"
>
  {#snippet child({ props })}
    <KeyboardEditorKeyboard {...props}>
      {#snippet keyGenerator(key)}
        {#if !keymap}
          <KeycodeButton.Skeleton />
        {:else}
          <ToggleGroup.Item
            oncontextmenu={(e) => {
              e.preventDefault()
              keymapQuery.set({ layer, offset: key, data: [Keycode.KC_NO] })
            }}
            value={String(key)}
          >
            {#snippet child({ props })}
              <KeycodeButton.Root
                keycode={advancedKeymap.get(`${layer}:${key}`) ??
                  keymap[layer][key]}
                showTooltip
                {...props}
              />
            {/snippet}
          </ToggleGroup.Item>
        {/if}
      {/snippet}
    </KeyboardEditorKeyboard>
  {/snippet}
</ToggleGroup.Root>
