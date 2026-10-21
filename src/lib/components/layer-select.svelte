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
  import { inUseQueryContext } from "$lib/configurator/queries/in-use-query.svelte"
  import { keyboardContext } from "$lib/keyboard"
  import { cn, type WithoutChildren } from "$lib/utils"
  import type { HTMLAttributes } from "svelte/elements"
  import { Button } from "./ui/button"
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

  // MAD60 HE fork: the layers in use, with a button to add one (firmware v1.4)
  const inUse = inUseQueryContext.getOr(null)
  const shown = $derived(
    numLayers ??
      inUse?.current.layers ??
      keyboardContext.get().metadata.numLayers,
  )
  const canAdd = $derived(
    numLayers === undefined &&
      !!inUse?.adjustable &&
      inUse.current.layers < inUse.max.layers,
  )
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
  {#if canAdd}
    <Button
      aria-label="Add a layer"
      {disabled}
      onclick={() => inUse?.add("layers")}
      size="icon-sm"
      title={`Add layer ${shown} (up to ${inUse?.max.layers})`}
      variant="outline"
    >
      <PlusIcon />
    </Button>
  {/if}
</div>
