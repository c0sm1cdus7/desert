<script lang="ts">
  import type {Snippet} from 'svelte';
  import type {PrimitiveId} from '../../../../interaction/catalog.ts';
  let {kind, children}: {kind:PrimitiveId; children:Snippet}=$props();
  // Placement belongs to composition, never to Badge, Avatar or Image itself.
  // Framed controls already provide their own internal reading inset.
  const contentKinds:readonly PrimitiveId[]=['control.tag','control.avatar','control.image','catalog.card','availability'];
  let placement=$derived(contentKinds.includes(kind)?'content':'surface');
</script>
<div data-stack-item data-stack-kind={kind} data-stack-placement={placement}>
  {@render children()}
</div>
