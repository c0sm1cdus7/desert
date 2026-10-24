<script lang="ts">
  import type {ResolvedNodeId} from '../../../../interaction/catalog.ts';
  import type {CatalogProps} from '../../types.d.ts';
  let {kind, children}: CatalogProps<'stack-item'>=$props();
  // Placement belongs to composition, never to Badge, Avatar or Image itself.
  // Framed controls already provide their own internal reading inset.
  const contentKinds:readonly ResolvedNodeId[]=['control.tag','control.avatar','control.image','catalog.card','availability'];
  let placement=$derived(contentKinds.includes(kind)?'content':'surface');
</script>
<div data-stack-item data-stack-kind={kind} data-stack-placement={placement}>
  {@render children?.()}
</div>
