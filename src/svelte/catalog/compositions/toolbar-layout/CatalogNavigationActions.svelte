<script lang="ts">
  import BankRenderer from "../../renderer/bank-renderer/BankRenderer.svelte";
  let { detail = false, onback, backAvailable=true }: {
    detail?: boolean; onback?: () => void; backAvailable?:boolean;
  } = $props();
</script>

<div data-catalog-navigation-actions>
  {#if detail && onback}
    <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", role: "secondary", action: {
      intent: { kind: "catalog.back" }, label: "Back", icon: "back", state: backAvailable?"ready":"unavailable",
    } }} onevent={event => { if (event.kind === "catalog.back"&&backAvailable) onback?.(); }} />
  {/if}
</div>
