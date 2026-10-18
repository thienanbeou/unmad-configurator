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
  import CommitSlider from "$lib/components/commit-slider.svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import * as Tabs from "$lib/components/ui/tabs"
  import { tapDanceActionMetadata } from "$lib/configurator/lib/advanced-keys"
  import {
    MAX_TAPPING_TERM,
    MIN_TAPPING_TERM,
    type HMK_AKTapDance,
  } from "$lib/libhmk/advanced-keys"
  import { configMenuStateContext } from "../context.svelte"
  import KeyTesterTab from "../key-tester-tab.svelte"
  import {
    MacroConfigMenuState,
    macroConfigMenuStateContext,
  } from "../macro/context.svelte"
  import MacroBindingsTab from "../macro/macro-bindings-tab.svelte"
  import MacroSequence from "../macro/macro-sequence.svelte"
  import TickRateSlider from "../tick-rate-slider.svelte"

  // One selected step across the four chains, so the Bindings tab works for
  // all of them
  macroConfigMenuStateContext.set(new MacroConfigMenuState())

  const configMenuState = configMenuStateContext.get()
  const action = $derived(configMenuState.advancedKey.action as HMK_AKTapDance)

  function setActionHead(index: number, head: number) {
    const actions = [...action.actions]
    actions[index] = head
    return configMenuState.updateAction({ ...action, actions })
  }
</script>

<FixedScrollArea class="flex flex-col gap-6 p-4 pt-0">
  <div class="grid text-sm">
    <span class="font-medium">Configure Tap Dance Actions</span>
    <span class="text-muted-foreground">
      Each action is a sequence of steps. A single Press step types the key and
      keeps it held while the key is held. Select a step, then pick its key on
      the right.
    </span>
  </div>
  {#each tapDanceActionMetadata as { action: index, title, description } (index)}
    <MacroSequence
      head={action.actions[index]}
      setHead={(head) => setActionHead(index, head)}
      {title}
      {description}
    />
  {/each}
</FixedScrollArea>
<FixedScrollArea class="flex flex-col gap-4 p-4 pt-0">
  <Tabs.Root value="bindings">
    <Tabs.List>
      <Tabs.Trigger value="bindings">Bindings</Tabs.Trigger>
      <Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
      <Tabs.Trigger value="key-tester">Key Tester</Tabs.Trigger>
    </Tabs.List>
    <div class="p-2">
      <Tabs.Content value="bindings">
        {#snippet child({ props })}
          <MacroBindingsTab {...props} />
        {/snippet}
      </Tabs.Content>
      <Tabs.Content value="advanced">
        {#snippet child({ props })}
          <div class="flex flex-col gap-4" {...props}>
            <CommitSlider
              bind:committed={
                () => action.tappingTerm,
                (v) =>
                  configMenuState.updateAction({ ...action, tappingTerm: v })
              }
              description="Time allowed between presses to count as a double tap, and how long a press must last to count as a hold. Restarts on each press."
              display={(v) => `${v}ms`}
              min={MIN_TAPPING_TERM}
              max={MAX_TAPPING_TERM}
              step={10}
              title="Tapping Term"
            />
            <TickRateSlider />
          </div>
        {/snippet}
      </Tabs.Content>
      <Tabs.Content value="key-tester">
        {#snippet child({ props })}
          <KeyTesterTab {...props} />
        {/snippet}
      </Tabs.Content>
    </div>
  </Tabs.Root>
</FixedScrollArea>
