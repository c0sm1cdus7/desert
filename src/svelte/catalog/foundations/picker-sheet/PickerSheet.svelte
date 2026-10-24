<script lang="ts">
  // F1-merge: transitional adapter of the piece merged into modal (presentation "sheet"). Choice (lane F1c) opens its
  // menu through Popover, which presents this sheet itself; this folder is deleted in Batch 3.
  import { type Snippet } from "svelte";
  import { Modal } from "../../index.ts";
  import { provideFocusReturn } from "../../mechanisms/surface-focus/focus-return.ts";
  let { open = $bindable(false), label, triggerId, children }: {
    open: boolean; label: string; triggerId: string; children: Snippet;
  } = $props();
  provideFocusReturn(() => document.getElementById(triggerId));
</script>
<Modal {label} {open} locked={false} presentation="sheet" ondismiss={() => { open = false; }}>
  <div class="picker-content-inset pt-2 pb-4">{@render children()}</div>
</Modal>
