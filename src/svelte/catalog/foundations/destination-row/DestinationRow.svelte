<script lang="ts">
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { Icon } from "../../index.ts";
  import { Face } from '../../index.ts';
  import type { CatalogProps } from '../../types.d.ts';
let { destination, label, available, open, icon = 'open', reason }: CatalogProps<'destination-row'> = $props();
  const generatedId = $props.id();
  const descriptionId = `${generatedId}-reason`;
</script>
<Button variant="row" size="row" class="destination-row" type="button"
  data-piece="destination-row" data-destination={destination} data-grouped-row
  disabled={!available} aria-describedby={!available && reason ? descriptionId : undefined} title={!available ? reason : undefined} onclick={()=>{if(available)open();}}>
  <Face face={{kind:'icon',icon}} />
  <span class="destination-title">{label}</span>
  <Icon name="chevron-right" placement="inline-end" chevron destination decorative />
</Button>
{#if !available && reason}<span id={descriptionId} class="sr-only">{reason}</span>{/if}
