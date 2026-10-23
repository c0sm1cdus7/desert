<script lang="ts">
  import type {RelatedSelectionSnapshot} from '../../interaction/related-selection.ts';
  import type {BankEvent} from '../../interaction/bank-events.ts';
  import RelatedSelection from '../pieces/RelatedSelection.svelte';
  let {state,onevent}:{state:RelatedSelectionSnapshot;onevent:(event:BankEvent)=>void}=$props();
</script>
<RelatedSelection {state} {onevent}/>
