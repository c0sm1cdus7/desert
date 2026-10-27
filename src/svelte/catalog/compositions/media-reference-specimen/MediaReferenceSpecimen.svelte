<script lang="ts">
  import { onDestroy } from 'svelte';
  import { MediaReferenceSelector } from '../../index.ts';
  import { providePrivateImages } from '../../../infra/private-image-context.ts';
  import { privateImageAccess } from '../../../../web/client/private-images.ts';
  import type { LabelsNode } from '../../../../interaction/labels-control.ts';
  const source = { kind: 'asset' as const, reference: 'a7000000-0000-4000-8000-000000000001' };
  const images = privateImageAccess(asset => asset.reference === source.reference ? {
    valid: () => true, read: async (_variant, signal) => (await fetch('/bank-image.svg', { signal })).blob(),
  } : undefined);
  providePrivateImages(images); onDestroy(() => images.close());
  let values = $state<readonly string[]>([]);
  let node = $derived<LabelsNode>({version:'desert.control/1',kind:'labels',id:'cover',label:'Cover',values,disabled:false,
    limits:{maxItems:1,maxLength:36},mediaReference:{options:[{value:'image-1',source}],loading:false}});
</script>
<MediaReferenceSelector {node} onevent={event => { if(event.kind === 'labels.change') values = event.values; }} />
