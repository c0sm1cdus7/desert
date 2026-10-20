<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>

<!-- A transparent geometry owner, never a second pane inside the host. -->
<div class="choice-list" data-choice-list data-material="interior">{@render children()}</div>
