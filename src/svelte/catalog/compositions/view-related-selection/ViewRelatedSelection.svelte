<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { RelatedSelection } from '../../index.ts';
  let { state, onevent }: CatalogProps<"view-related-selection"> = $props();
</script>
<RelatedSelection {state} {onevent}/>
