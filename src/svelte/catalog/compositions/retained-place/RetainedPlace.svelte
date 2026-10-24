<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { provideSurfaceActivity } from '../../../infra/surface-activity.svelte.ts';
  let { active, visible = active, children }: CatalogProps<"retained-place"> = $props();
  provideSurfaceActivity(() => active);
</script>
<div data-retained-place hidden={!visible}>{@render children?.()}</div>
