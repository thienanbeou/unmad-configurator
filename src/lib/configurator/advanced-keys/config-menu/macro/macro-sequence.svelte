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
  import { PlusIcon } from "@lucide/svelte"
  import { Button } from "$lib/components/ui/button"
  import * as Empty from "$lib/components/ui/empty"
  import {
    findEmptyMacroNode,
    getMacroSequence,
  } from "$lib/configurator/lib/advanced-keys"
  import { macrosQueryContext } from "$lib/configurator/queries/macros-query.svelte"
  import { Keycode } from "$lib/libhmk/keycodes"
  import { HMK_MACRO_NODE_NONE, HMK_MacroAction } from "$lib/libhmk/macro"
  import { numberNullable, stringNullable } from "$lib/utils"
  import { ToggleGroup } from "bits-ui"
  import { configMenuStateContext } from "../context.svelte"
  import { macroConfigMenuStateContext } from "./context.svelte"
  import MacroNode from "./macro-node.svelte"

  // One macro chain: `head` is its first node, `setHead` stores a new first
  // node in the advanced key that owns the chain (Macro or Tap Dance action)
  const {
    head,
    setHead,
    title,
    description,
  }: {
    head: number
    setHead: (head: number) => Promise<void>
    title?: string
    description?: string
  } = $props()

  const configMenuState = configMenuStateContext.get()
  const { advancedKeys, macros } = $derived(configMenuState)
  const macroConfigMenuState = macroConfigMenuStateContext.get()
  const { macroNodeId } = $derived(macroConfigMenuState)
  const macrosQuery = macrosQueryContext.get()

  const macroSequence = $derived(getMacroSequence(macros, head))
  const emptyMacroNode = $derived(findEmptyMacroNode(macros, advancedKeys))
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-end justify-between gap-2">
    <div class="grid text-sm">
      {#if title}
        <span class="font-medium">{title}</span>
      {/if}
      {#if description}
        <span class="text-muted-foreground">{description}</span>
      {/if}
    </div>
    <Button
      disabled={emptyMacroNode === null}
      onclick={async () => {
        if (emptyMacroNode === null) return
        await macrosQuery.set({
          offset: emptyMacroNode,
          data: [
            {
              keycode: Keycode.KC_NO,
              action: HMK_MacroAction.TAP,
              delay: 0,
              next: HMK_MACRO_NODE_NONE,
            },
          ],
        })
        if (macroSequence.length === 0) {
          await setHead(emptyMacroNode)
        } else {
          const tail = macroSequence[macroSequence.length - 1]
          await macrosQuery.set({
            offset: tail,
            data: [{ ...macros[tail], next: emptyMacroNode }],
          })
        }
      }}
      size="sm"
      variant="outline"
    >
      <PlusIcon /> Add
    </Button>
  </div>
  {#if macroSequence.length === 0}
    <Empty.Root class="border border-dashed">
      <Empty.Header>
        <Empty.Description>No macro actions...</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {:else}
    <ToggleGroup.Root
      bind:value={
        () => stringNullable(macroNodeId),
        (v) => (macroConfigMenuState.macroNodeId = numberNullable(v))
      }
      class="grid grid-flow-row auto-rows-[1fr] gap-2"
      type="single"
    >
      {#each macroSequence as macroNodeId, i (macroNodeId)}
        <MacroNode
          {macroNodeId}
          prevNodeId={i === 0 ? null : macroSequence[i - 1]}
          {setHead}
        />
      {/each}
    </ToggleGroup.Root>
  {/if}
</div>
