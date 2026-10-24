<script lang="ts">
  import type {RelatedSelectionSnapshot} from '../../../../interaction/related-selection.ts';
  import type {NodeEvent} from '../../../../interaction/node-events.ts';
  import { RelatedSelection } from '../../index.ts';
  let {state,onevent}:{state:RelatedSelectionSnapshot;onevent:(event:NodeEvent)=>void}=$props();
</script>
<RelatedSelection {state} {onevent}/>
