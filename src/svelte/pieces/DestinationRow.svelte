<script lang="ts">
  import { Button } from "../vendor/components/ui/button/index.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Face from './Face.svelte';
  import type { ActionIcon } from '../../interaction/action-icon.ts';
let { destination, label, available, open, icon = 'open', reason }: {
    destination: string; label: string; available: boolean; open: () => void; icon?: ActionIcon | undefined; reason?: string | undefined;
  } = $props();
  const generatedId = $props.id();
  const descriptionId = `${generatedId}-reason`;
</script>
<Button variant="row" size="row" class="destination-row" type="button"
  data-piece="destination-row" data-destination={destination} data-grouped-row
  disabled={!available} aria-describedby={!available && reason ? descriptionId : undefined} title={!available ? reason : undefined} onclick={()=>{if(available)open();}}>
  <Face face={{kind:'icon',icon}} />
  <span class="destination-title">{label}</span>
  <ChevronRight data-icon="inline-end" data-control-chevron data-destination-chevron aria-hidden="true" />
</Button>
{#if !available && reason}<span id={descriptionId} class="sr-only">{reason}</span>{/if}
