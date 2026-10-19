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
  import Switch from "$lib/components/switch.svelte"
  import { Button } from "$lib/components/ui/button"
  import * as Dialog from "$lib/components/ui/dialog"
  import { keyboardContext } from "$lib/keyboard"
  import { cn, isFeatureAvailable, type WithoutChildren } from "$lib/utils"
  import type { HTMLAttributes } from "svelte/elements"
  import { optionsQueryContext } from "../queries/options-query.svelte"
  import { profileQueryContext } from "../queries/profile-query.svelte"

  const {
    class: className,
    ...props
  }: WithoutChildren<HTMLAttributes<HTMLDivElement>> = $props()

  const keyboard = keyboardContext.get()
  const {
    demo,
    version,
    metadata: { usbHighSpeed },
  } = keyboard

  const profileQuery = profileQueryContext.get()
  const optionsQuery = optionsQueryContext.get()
  const { current: options } = $derived(optionsQuery.options)
</script>

<div
  class={cn("mx-auto flex size-full max-w-3xl flex-col", className)}
  {...props}
>
  <FixedScrollArea class="flex flex-col gap-4 p-4">
    {#if usbHighSpeed && isFeatureAvailable("pollingRateSwitch", version)}
      <Switch
        bind:checked={
          () => options?.highPollingRateEnabled ?? false,
          (v) =>
            options &&
            optionsQuery.set({
              data: { ...options, highPollingRateEnabled: v },
            })
        }
        id="8000hz-polling-rate"
        title="8000Hz Polling Rate"
        description="Enable the 8000Hz polling rate for faster response times, but may increase the CPU usage of the host device. Restart the keyboard to apply changes. This setting applies globally across all profiles."
      />
    {/if}
    <div class="flex flex-col gap-3">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Keyboard Switches</span>
        <span class="text-muted-foreground">
          Switches from the stock firmware, for all profiles. Each also has a
          key in the Special keycodes (on Fn in the stock layout); this page
          shows whether it is on.
        </span>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <Switch
          bind:checked={
            () => options?.wasdSwapEnabled ?? false,
            (v) =>
              options &&
              optionsQuery.set({ data: { ...options, wasdSwapEnabled: v } })
          }
          id="wasd-swap"
          title="WASD Swap"
          description="W, A, S and D act as the arrow keys."
        />
        <Switch
          bind:checked={
            () => options?.guiLockEnabled ?? false,
            (v) =>
              options &&
              optionsQuery.set({ data: { ...options, guiLockEnabled: v } })
          }
          id="win-lock"
          title="Win Lock"
          description="Block both Windows keys, e.g. while gaming."
        />
        <Switch
          bind:checked={
            () => options?.nkroDisabled ?? false,
            (v) =>
              options &&
              optionsQuery.set({ data: { ...options, nkroDisabled: v } })
          }
          id="6kro"
          title="6KRO Only"
          description="At most 6 keys at once, for BIOS screens and picky software."
        />
        <Switch
          bind:checked={
            () => options?.macModeEnabled ?? false,
            (v) =>
              options &&
              optionsQuery.set({ data: { ...options, macModeEnabled: v } })
          }
          id="mac-mode"
          title="Mac Mode"
          description="Swap Alt and Windows, so Command sits next to Space. Needs firmware v1.1 or later."
        />
      </div>
    </div>
    <Switch
      bind:checked={
        () => !(options?.capsIndicatorDisabled ?? false),
        (v) =>
          options &&
          optionsQuery.set({ data: { ...options, capsIndicatorDisabled: !v } })
      }
      id="caps-indicator"
      title="Caps Lock Indicator"
      description="Light the Caps Lock key while Caps Lock is on. Color and brightness are in the Lighting tab. Needs firmware v1.1 or later."
    />
    <Switch
      bind:checked={
        () => !(options?.layerIndicatorDisabled ?? false),
        (v) =>
          options &&
          optionsQuery.set({ data: { ...options, layerIndicatorDisabled: !v } })
      }
      id="layer-indicator"
      title="Layer Indicator"
      description="While a layer other than 0 is on, light the keys that do something there. Color and brightness are in the Lighting tab. Needs firmware v1.2 or later."
    />
    <div class="flex flex-col gap-2">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Restart Keyboard</span>
        <span class="text-muted-foreground">
          The keyboard will disconnect and reconnect. No changes will be made to
          your keyboard settings.
        </span>
      </div>
      <div>
        <Button
          disabled={demo}
          onclick={() => keyboard.reboot()}
          size="sm"
          variant="outline"
        >
          Restart Keyboard
        </Button>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Enter Bootloader Mode</span>
        <span class="text-muted-foreground">
          The keyboard will restart and enter bootloader mode if it is supported
          by the firmware. No changes will be made to your keyboard settings.
        </span>
      </div>
      <div>
        <Button
          disabled={demo}
          onclick={() => keyboard.bootloader()}
          size="sm"
          variant="outline"
        >
          Enter Bootloader Mode
        </Button>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="grid text-sm text-wrap">
        <span class="font-semibold">Factory Reset</span>
        <span class="text-muted-foreground">
          Revert the keyboard to its factory settings defined by the firmware.
          All user data and settings will be lost.
        </span>
      </div>
      <div>
        <Dialog.Root>
          <Dialog.Trigger>
            {#snippet child({ props })}
              <Button
                disabled={demo}
                size="sm"
                variant="destructive"
                {...props}
              >
                Factory Reset
              </Button>
            {/snippet}
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Factory Reset?</Dialog.Title>
              <Dialog.Description>
                Are you sure you want to factory reset your keyboard?
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close>
                {#snippet child({ props })}
                  <Button size="sm" variant="outline" {...props}>Cancel</Button>
                {/snippet}
              </Dialog.Close>
              <Dialog.Close onclick={() => profileQuery.factoryReset()}>
                {#snippet child({ props })}
                  <Button size="sm" variant="destructive" {...props}>
                    Factory Reset
                  </Button>
                {/snippet}
              </Dialog.Close>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </div>
  </FixedScrollArea>
</div>
