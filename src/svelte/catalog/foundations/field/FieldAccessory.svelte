<script lang="ts">
  // The trailing accessory slot of a Field's well: the caller's action, inset equally from the well's top, end and bottom
  // edges (law 9d); it tells that action it is a field accessory, so the action draws its concentric radius itself.
  import type { Snippet } from "svelte";
  import { provideFieldAccessory } from "../../mechanisms/field-accessory/field-accessory.svelte.ts";
  let { children }: { children: Snippet } = $props();
  provideFieldAccessory();
</script>
<div class="field-accessory" data-field-accessory>{@render children()}</div>
