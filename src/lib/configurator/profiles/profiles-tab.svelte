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
  import { EllipsisVerticalIcon, PlusIcon, Trash2Icon } from "@lucide/svelte"
  import FixedScrollArea from "$lib/components/fixed-scroll-area.svelte"
  import { Badge } from "$lib/components/ui/badge"
  import { Button } from "$lib/components/ui/button"
  import * as Dialog from "$lib/components/ui/dialog"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu"
  import { keyboardContext } from "$lib/keyboard"
  import { cn, type WithoutChildren } from "$lib/utils"
  import { toast } from "svelte-sonner"
  import type { HTMLAttributes } from "svelte/elements"
  import z from "zod"
  import { globalStateContext } from "../context.svelte"
  import { KeyboardConfig } from "../lib/keyboard-config.svelte"
  import { inUseQueryContext } from "../queries/in-use-query.svelte"
  import { profileQueryContext } from "../queries/profile-query.svelte"

  const {
    class: className,
    ...props
  }: WithoutChildren<HTMLAttributes<HTMLDivElement>> = $props()

  const { name } = keyboardContext.get().metadata
  // MAD60 HE fork: the profiles in use, and adding one (firmware v1.4)
  const inUse = inUseQueryContext.get()
  const numProfiles = $derived(inUse.current.profiles)
  const globalState = globalStateContext.get()

  // Takes the last profile out (never profile 0); the firmware resets it
  async function removeLastProfile() {
    const last = numProfiles - 1
    await inUse.remove("profiles")
    if (globalState.profile >= last) globalState.setProfile(0)
  }

  const profileQuery = profileQueryContext.get()
  const { current: currentProfile } = $derived(profileQuery.profile)
  const keyboardConfig = new KeyboardConfig()

  let fileRef: HTMLInputElement | null = $state(null)
  let anchorRef: HTMLAnchorElement | null = $state(null)

  const importProfile = async (profile: number) => {
    if (!fileRef) return
    fileRef.onchange = null
    fileRef.value = ""
    fileRef.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const json = JSON.parse(await file.text())
        await keyboardConfig.setConfig(profile, json)
        toast.success(`Successfully imported Profile ${profile}.`)
      } catch (err) {
        if (err instanceof SyntaxError) {
          toast.error("The selected file is not a valid JSON.")
        } else if (err instanceof z.ZodError) {
          toast.error(
            "The selected file is not a valid keyboard metadata. See console for details.",
          )
          console.error(z.treeifyError(err))
        } else {
          toast.error(String(err))
        }
      }
    }
    fileRef.click()
  }

  const exportProfile = async (profile: number) => {
    if (!anchorRef) return
    try {
      const config = await keyboardConfig.getConfig(profile)
      const blob = new Blob([JSON.stringify(config)], {
        type: "application/json",
      })
      anchorRef.href = URL.createObjectURL(blob)
      anchorRef.download = `${name}-profile-${profile}.json`
      toast.success(`Successfully exported Profile ${profile}.`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(
          "Unexpected keyboard configuration schema error. See console for details.",
        )
        console.error(z.treeifyError(err))
      } else {
        toast.error(String(err))
      }
    }
    anchorRef.click()
  }
</script>

<div
  class={cn("mx-auto flex size-full max-w-3xl flex-col", className)}
  {...props}
>
  <FixedScrollArea class="flex flex-col gap-4 p-4">
    <div class="grid shrink-0">
      <span class="font-semibold">Configure Profiles</span>
      <span class="text-sm text-muted-foreground">
        Manage your keyboard profiles here. You can import, export, and
        customize them.
      </span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      {#each { length: numProfiles }, profile (profile)}
        <div
          class="flex items-center gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div class="grid flex-1 truncate font-semibold">
            Profile {profile}
          </div>
          <div class="flex shrink-0 items-center gap-2">
            {#if profile === currentProfile}
              <Badge>Active</Badge>
            {/if}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <Button size="icon" variant="ghost" {...props}>
                    <EllipsisVerticalIcon />
                    <span class="sr-only">Open Menu</span>
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start" class="w-40">
                <DropdownMenu.Group>
                  <DropdownMenu.Item onSelect={() => importProfile(profile)}>
                    Import
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => exportProfile(profile)}>
                    Export
                  </DropdownMenu.Item>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      Duplicate From
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      {#each { length: numProfiles }, srcProfile (srcProfile)}
                        {#if srcProfile !== profile}
                          <DropdownMenu.Item
                            onSelect={() =>
                              profileQuery.duplicateProfile({
                                profile,
                                srcProfile,
                              })}
                          >
                            Profile {srcProfile}
                          </DropdownMenu.Item>
                        {/if}
                      {/each}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                  <DropdownMenu.Item
                    onSelect={() => profileQuery.resetProfile({ profile })}
                  >
                    Restore Default
                  </DropdownMenu.Item>
                </DropdownMenu.Group>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      {/each}
    </div>
    {#if inUse.adjustable}
      <div class="flex flex-wrap items-center gap-2">
        {#if numProfiles < inUse.max.profiles}
          <Button
            onclick={() => inUse.add("profiles")}
            size="sm"
            variant="outline"
          >
            <PlusIcon />
            Add Profile {numProfiles}
          </Button>
        {/if}
        <Dialog.Root>
          <Dialog.Trigger>
            {#snippet child({ props })}
              <Button
                disabled={numProfiles <= 1}
                size="sm"
                title={numProfiles <= 1 ? "Profile 0 always stays" : undefined}
                variant="outline"
                {...props}
              >
                <Trash2Icon />
                Remove Profile {numProfiles - 1}
              </Button>
            {/snippet}
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Remove profile {numProfiles - 1}?</Dialog.Title>
              <Dialog.Description>
                Are you sure? Profile {numProfiles - 1} goes back to the default layout
                (keymap, advanced keys, macros, actuation) and is hidden. Export it
                first to keep it. Profile 0 always stays. This cannot be undone.
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close>
                {#snippet child({ props })}
                  <Button size="sm" variant="outline" {...props}>Cancel</Button>
                {/snippet}
              </Dialog.Close>
              <Dialog.Close onclick={removeLastProfile}>
                {#snippet child({ props })}
                  <Button size="sm" variant="destructive" {...props}>
                    Remove Profile {numProfiles - 1}
                  </Button>
                {/snippet}
              </Dialog.Close>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
        <span
          class="text-sm text-muted-foreground tabular-nums"
          title={`${numProfiles} profiles in use; this keyboard has room for ${inUse.max.profiles}`}
        >
          {numProfiles}/{inUse.max.profiles}
        </span>
      </div>
    {/if}
  </FixedScrollArea>
</div>
<input
  bind:this={fileRef}
  accept="application/json"
  aria-hidden="true"
  hidden
  type="file"
/>
<a bind:this={anchorRef} aria-hidden="true" hidden href="#0"></a>
