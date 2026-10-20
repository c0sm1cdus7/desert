<script lang="ts">
  import type { Snippet } from 'svelte';
  import { provideSurfaceActivity } from '../pieces/surface-activity.svelte.ts';
  let { active, visible = active, children }: { active: boolean; visible?: boolean; children: Snippet } = $props();
  provideSurfaceActivity(() => active);
</script>
<div data-retained-place hidden={!visible}>{@render children()}</div>
