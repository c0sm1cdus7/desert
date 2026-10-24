<script lang="ts">
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import { Spinner } from "../../../vendor/components/ui/spinner/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { state, label }: CatalogProps<"availability"> = $props();
</script>
<div class="bank-status" role="status" aria-live="polite" data-primitive="availability" data-ready={state === "ready"}>
  {#if state === "ready"}<CircleCheck class="text-success" aria-hidden="true" />{:else if state === "unknown"}<Spinner aria-hidden="true" />{:else}<CircleAlert class="text-warning" aria-hidden="true" />{/if}
  <span>{label}</span>
</div>
