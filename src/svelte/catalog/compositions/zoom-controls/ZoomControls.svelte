<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { Icon } from '../../index.ts';
  import { maximumMediaZoom } from '../../../infra/gestures.ts';
  let {scale,onzoom,onreset}:CatalogProps<"zoom-controls">=$props();
</script>

<div data-toolbar-auxiliary>
  <Button variant="secondary" size="icon-lg" aria-label="Zoom out" disabled={scale<=1} onclick={()=>onzoom?.(scale-1)}><Icon name="minus" /></Button>
  <Button variant="secondary" aria-label="Reset zoom" onclick={onreset}><span data-media-zoom>{Math.round(scale*100)}%</span></Button>
  <Button variant="secondary" size="icon-lg" aria-label="Zoom in" disabled={scale>=maximumMediaZoom} onclick={()=>onzoom?.(scale+1)}><Icon name="plus" /></Button>
</div>
