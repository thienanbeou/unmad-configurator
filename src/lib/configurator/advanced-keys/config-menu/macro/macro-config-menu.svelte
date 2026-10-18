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
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import * as Tabs from "$lib/components/ui/tabs"
  import type { HMK_AKMacro } from "$lib/libhmk/advanced-keys"
  import { configMenuStateContext } from "../context.svelte"
  import KeyTesterTab from "../key-tester-tab.svelte"
  import TickRateSlider from "../tick-rate-slider.svelte"
  import {
    MacroConfigMenuState,
    macroConfigMenuStateContext,
  } from "./context.svelte"
  import MacroBindingsTab from "./macro-bindings-tab.svelte"
  import MacroSequence from "./macro-sequence.svelte"

  macroConfigMenuStateContext.set(new MacroConfigMenuState())

  const configMenuState = configMenuStateContext.get()
  const action = $derived(configMenuState.advancedKey.action as HMK_AKMacro)
</script>

<FixedScrollArea class="flex flex-col gap-4 p-4 pt-0">
  <MacroSequence
    head={action.head}
    setHead={(head) => configMenuState.updateAction({ ...action, head })}
    title="Configure Macro Actions"
    description="Create a sequence of actions to be triggered when the key is pressed. Assign bindings for each action using the menu on the right."
  />
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
          <TickRateSlider {...props} />
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
