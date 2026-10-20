<script lang="ts">
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import { Spinner } from "../vendor/components/ui/spinner/index.js";
let { state, label }: { state: "ready" | "unavailable" | "unknown"; label: string } = $props();
</script>
<div class="bank-status" role="status" aria-live="polite" data-primitive="availability" data-ready={state === "ready"}>
  {#if state === "ready"}<CircleCheck class="text-success" aria-hidden="true" />{:else if state === "unknown"}<Spinner aria-hidden="true" />{:else}<CircleAlert class="text-warning" aria-hidden="true" />{/if}
  <span>{label}</span>
</div>
