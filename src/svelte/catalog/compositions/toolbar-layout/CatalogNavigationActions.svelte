<script lang="ts">
  import { NodeRenderer } from "../../index.ts";
  let { detail = false, onback, backAvailable=true }: {
    detail?: boolean; onback?: () => void; backAvailable?:boolean;
  } = $props();
</script>

<div data-catalog-navigation-actions>
  {#if detail && onback}
    <NodeRenderer node={{ version: "desert.bank-node/1", kind: "action", role: "secondary", action: {
      intent: { kind: "catalog.back" }, label: "Back", icon: "back", state: backAvailable?"ready":"unavailable",
    } }} onevent={event => { if (event.kind === "catalog.back"&&backAvailable) onback?.(); }} />
  {/if}
</div>
