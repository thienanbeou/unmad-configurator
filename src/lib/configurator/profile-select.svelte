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
  import { KeyboardIcon, PlusIcon } from "@lucide/svelte"
  import * as Select from "$lib/components/ui/select"
  import * as Tooltip from "$lib/components/ui/tooltip"
  import { globalStateContext } from "./context.svelte"
  import { inUseQueryContext } from "./queries/in-use-query.svelte"
  import { profileQueryContext } from "./queries/profile-query.svelte"

  const globalState = globalStateContext.get()
  const { profile } = $derived(globalState)
  // MAD60 HE fork: the profiles in use, with an item to add one (firmware v1.4)
  const inUse = inUseQueryContext.get()
  const numProfiles = $derived(inUse.current.profiles)
  const canAdd = $derived(
    inUse.adjustable && inUse.current.profiles < inUse.max.profiles,
  )

  const { current: keyboardProfile } = $derived(
    profileQueryContext.get().profile,
  )
</script>

<Select.Root
  bind:value={
    () => String(profile),
    (v) => {
      if (v === "add") {
        const added = numProfiles
        inUse.add("profiles").then(() => globalState.setProfile(added))
      } else globalState.setProfile(Number(v))
    }
  }
  type="single"
>
  <Select.Trigger class="w-48" size="sm">
    <span class="flex items-center gap-2">
      Profile {profile}
      {#if keyboardProfile === profile}
        <KeyboardIcon />
      {/if}
    </span>
  </Select.Trigger>
  <Select.Content class="w-[var(--bits-select-anchor-width)]">
    {#each { length: numProfiles }, i (i)}
      <Select.Item value={String(i)}>
        <span class="flex items-center gap-2">
          Profile {i}
          {#if keyboardProfile === i}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <KeyboardIcon />
                <span class="sr-only">Active</span>
              </Tooltip.Trigger>
              <Tooltip.Content>Current Active Profile</Tooltip.Content>
            </Tooltip.Root>
          {/if}
        </span>
      </Select.Item>
    {/each}
    {#if canAdd}
      <Select.Item value="add">
        <span class="flex items-center gap-2">
          <PlusIcon />
          Add Profile {numProfiles}
        </span>
      </Select.Item>
    {/if}
  </Select.Content>
</Select.Root>
