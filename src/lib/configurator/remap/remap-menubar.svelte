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
  import * as KeyboardEditor from "$lib/components/keyboard-editor"
  import LayerSelect from "$lib/components/layer-select.svelte"
  import { Button } from "$lib/components/ui/button"
  import * as Dialog from "$lib/components/ui/dialog"
  import { keyboardContext } from "$lib/keyboard"
  import { globalStateContext, remapStateContext } from "../context.svelte"
  import { keymapQueryContext } from "../queries/keymap-query.svelte"

  const { profile } = $derived(globalStateContext.get())
  const remapState = remapStateContext.get()
  const { layer } = $derived(remapState)
  const { defaultKeymaps } = keyboardContext.get().metadata

  const keymapQuery = keymapQueryContext.get()
</script>

<KeyboardEditor.Menubar>
  <LayerSelect bind:layer={() => layer, (v) => remapState.setLayer(v)} />
  <div class="flex items-center gap-2">
    <Dialog.Root>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button size="sm" variant="destructive" {...props}>
            Reset Current Layer
          </Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Reset layer {layer}?</Dialog.Title>
          <Dialog.Description>
            Are you sure? Every key on layer {layer} of profile {profile} goes back
            to the firmware's default layout. Other layers, advanced keys and macros
            are kept. This cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close>
            {#snippet child({ props })}
              <Button size="sm" variant="outline" {...props}>Cancel</Button>
            {/snippet}
          </Dialog.Close>
          <Dialog.Close
            onclick={() =>
              keymapQuery.set({
                layer,
                offset: 0,
                data: defaultKeymaps[profile][layer],
              })}
          >
            {#snippet child({ props })}
              <Button size="sm" variant="destructive" {...props}>
                Reset Layer {layer}
              </Button>
            {/snippet}
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
    <KeyboardEditor.LayoutDialog />
  </div>
</KeyboardEditor.Menubar>
