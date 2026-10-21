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
  import { PlusIcon, Trash2Icon } from "@lucide/svelte"
  import { inUseQueryContext } from "$lib/configurator/queries/in-use-query.svelte"
  import { keyboardContext } from "$lib/keyboard"
  import { cn, type WithoutChildren } from "$lib/utils"
  import type { HTMLAttributes } from "svelte/elements"
  import { Button } from "./ui/button"
  import * as Dialog from "./ui/dialog"
  import * as ToggleGroup from "./ui/toggle-group"

  let {
    class: className,
    disabled,
    numLayers,
    layer = $bindable(0),
    onLayerChange,
    ...props
  }: WithoutChildren<HTMLAttributes<HTMLDivElement>> & {
    disabled?: boolean
    numLayers?: number
    layer?: number
    onLayerChange?: (layer: number) => void
  } = $props()

  // MAD60 HE fork: the layers in use, out of the room there is, with buttons
  // to add one and remove the last (never layer 0) (firmware v1.4)
  const inUse = inUseQueryContext.getOr(null)
  const shown = $derived(
    numLayers ??
      inUse?.current.layers ??
      keyboardContext.get().metadata.numLayers,
  )
  const adjustable = $derived(numLayers === undefined && !!inUse?.adjustable)
  const max = $derived(inUse?.max.layers ?? shown)

  async function removeLast() {
    const last = shown - 1
    await inUse?.remove("layers")
    if (layer >= last) {
      layer = last - 1
      onLayerChange?.(layer)
    }
  }
</script>

<div class={cn("flex items-center gap-2", className)} {...props}>
  <span class={cn("text-sm font-medium", disabled && "opacity-50")}>
    Layer
  </span>
  <ToggleGroup.Root
    bind:value={
      () => String(layer),
      (v) => {
        if (v === "") return
        layer = Number(v)
        onLayerChange?.(layer)
      }
    }
    {disabled}
    type="single"
    variant="outline"
  >
    {#each { length: shown }, i (i)}
      <ToggleGroup.Item value={String(i)}>
        {i}
      </ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
  {#if adjustable}
    {#if shown < max}
      <Button
        aria-label="Add a layer"
        {disabled}
        onclick={() => inUse?.add("layers")}
        size="icon-sm"
        title={`Add layer ${shown}`}
        variant="outline"
      >
        <PlusIcon />
      </Button>
    {/if}
    <Dialog.Root>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button
            aria-label="Remove the last layer"
            disabled={disabled || shown <= 1}
            size="icon-sm"
            title={shown <= 1
              ? "Layer 0 always stays"
              : `Remove layer ${shown - 1} (only the last layer can go)`}
            variant="outline"
            {...props}
          >
            <Trash2Icon />
          </Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Remove layer {shown - 1}?</Dialog.Title>
          <Dialog.Description>
            Are you sure? Layer {shown - 1} is removed from every profile: its keys
            go back to transparent and its advanced keys (tap dances, macros and the
            rest) are deleted. Layer 0 always stays. This cannot be undone.
          </Dialog.Description>
          <Dialog.Description>
            Only the last layer can be removed: taking one out of the middle
            would renumber every layer key above it (MO, TO, DF, OSL, also in
            tap dances). To drop a middle layer, copy the layers above it down
            first.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close>
            {#snippet child({ props })}
              <Button size="sm" variant="outline" {...props}>Cancel</Button>
            {/snippet}
          </Dialog.Close>
          <Dialog.Close onclick={removeLast}>
            {#snippet child({ props })}
              <Button size="sm" variant="destructive" {...props}>
                Remove Layer {shown - 1}
              </Button>
            {/snippet}
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
    <span
      class={cn(
        "text-sm text-muted-foreground tabular-nums",
        disabled && "opacity-50",
      )}
      title={`${shown} layers in use; this keyboard has room for ${max}`}
    >
      {shown}/{max}
    </span>
  {/if}
</div>
