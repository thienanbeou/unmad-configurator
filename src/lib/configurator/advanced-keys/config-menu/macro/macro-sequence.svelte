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
  import { GripVerticalIcon, PlusIcon } from "@lucide/svelte"
  import { Button } from "$lib/components/ui/button"
  import * as Empty from "$lib/components/ui/empty"
  import {
    findEmptyMacroNode,
    getMacroSequence,
  } from "$lib/configurator/lib/advanced-keys"
  import { macrosQueryContext } from "$lib/configurator/queries/macros-query.svelte"
  import { Keycode } from "$lib/libhmk/keycodes"
  import { HMK_MACRO_NODE_NONE, HMK_MacroAction } from "$lib/libhmk/macro"
  import { cn, numberNullable, stringNullable } from "$lib/utils"
  import { ToggleGroup } from "bits-ui"
  import { tick } from "svelte"
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

  // Step being dragged and the step it would land on (positions in the chain)
  let dragFrom: number | null = $state(null)
  let dropAt: number | null = $state(null)

  // Move a step from one position to another. The nodes and their links stay
  // where they are; only the step contents (keycode, action, delay) move, so
  // the head and every `next` stay valid.
  async function move(from: number, to: number) {
    if (from === to) return
    const sequence = [...macroSequence]
    const before = sequence.map((id) => ({ ...macros[id] }))
    const order = sequence.map((_, i) => i)
    order.splice(to, 0, ...order.splice(from, 1))
    const selected = sequence.indexOf(macroNodeId ?? -1)
    if (selected !== -1) {
      macroConfigMenuState.macroNodeId = sequence[order.indexOf(selected)]
    }
    for (let i = 0; i < sequence.length; i++) {
      const { keycode, action, delay } = before[order[i]]
      const node = before[i]
      if (
        keycode === node.keycode &&
        action === node.action &&
        delay === node.delay
      )
        continue
      await macrosQuery.set({
        offset: sequence[i],
        data: [{ ...node, keycode, action, delay }],
      })
    }
  }
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
          class={cn(
            dragFrom === i && "opacity-50",
            dragFrom !== null &&
              dragFrom !== i &&
              dropAt === i &&
              "ring-2 ring-primary",
          )}
          ondragover={(e) => {
            if (dragFrom === null) return
            e.preventDefault()
            dropAt = i
          }}
          ondrop={(e) => {
            e.preventDefault()
            if (dragFrom !== null) move(dragFrom, i)
            dragFrom = dropAt = null
          }}
        >
          {#snippet handle()}
            <button
              aria-label="Move step (drag, or Arrow Up / Arrow Down)"
              class="cursor-grab rounded p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
              data-step-handle
              draggable="true"
              ondragend={() => (dragFrom = dropAt = null)}
              ondragstart={(e) => {
                dragFrom = i
                e.dataTransfer?.setData("text/plain", String(i))
                const card = e.currentTarget.parentElement?.parentElement
                if (card) e.dataTransfer?.setDragImage(card, 16, 16)
              }}
              onkeydown={async (e) => {
                const to =
                  e.key === "ArrowUp"
                    ? i - 1
                    : e.key === "ArrowDown"
                      ? i + 1
                      : -1
                if (to < 0 || to >= macroSequence.length) return
                e.preventDefault()
                const group = e.currentTarget.closest("[role=group]")
                await move(i, to)
                await tick()
                group
                  ?.querySelectorAll<HTMLElement>("[data-step-handle]")
                  [to]?.focus()
              }}
              title="Drag to reorder"
              type="button"
            >
              <GripVerticalIcon class="size-4" />
            </button>
          {/snippet}
        </MacroNode>
      {/each}
    </ToggleGroup.Root>
  {/if}
</div>
