<script lang="ts">
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import BankRenderer from "../BankRenderer.svelte";
  let { detail = false, onback }: { detail?: boolean; onback?: () => void } = $props();
  const sidebar = Sidebar.useSidebar();
</script>

<div data-catalog-navigation-actions>
  {#if !sidebar.expanded}
    <Sidebar.Trigger variant="secondary" size="icon" aria-label="Show navigation" title="Show navigation" />
  {/if}
  {#if detail && onback}
    <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", role: "secondary", action: {
      intent: { kind: "catalog.back" }, label: "Back", icon: "back", state: "ready",
    } }} onevent={event => { if (event.kind === "catalog.back") onback?.(); }} />
  {/if}
</div>
