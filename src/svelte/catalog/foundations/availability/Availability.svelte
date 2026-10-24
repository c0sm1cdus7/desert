<script lang="ts">
  import { Icon, Loading } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { state, label }: CatalogProps<"availability"> = $props();
</script>
<div class="bank-status" role="status" aria-live="polite" data-primitive="availability" data-ready={state === "ready"}>
  {#if state === "ready"}<Icon name="circle-check" tone="success" decorative />{:else if state === "unknown"}<Loading kind="spinner" {label} />{:else}<Icon name="circle-alert" tone="warning" decorative />{/if}
  <span>{label}</span>
</div>
