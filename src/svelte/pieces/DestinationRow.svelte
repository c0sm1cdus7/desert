<script lang="ts">
  import { Button } from "../vendor/components/ui/button/index.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
let { destination, label, available, open }: {
    destination: string; label: string; available: boolean; open: () => void;
  } = $props();
</script>
<Button variant="row" size="row" class="destination-row" type="button"
  data-piece="destination-row" data-destination={destination} data-grouped-row
  disabled={!available} onclick={open}>
  <span class="destination-title">{label}</span>
  <ChevronRight data-icon="inline-end" data-control-chevron data-destination-chevron aria-hidden="true" />
</Button>
