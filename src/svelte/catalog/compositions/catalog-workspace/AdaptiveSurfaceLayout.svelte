<script lang="ts">
  import type { Snippet } from 'svelte';
  import { provideSurfaceHost } from '../../../infra/surface-host.svelte.ts';
  let { children }: { children: Snippet } = $props();
  let element = $state<HTMLDivElement | null>(null);
  let reservation = $state(0);
  provideSurfaceHost(() => element, { reserve: inline => reservation = inline });
</script>

<div bind:this={element} data-adaptive-host style:--surface-dock-reservation="{reservation}px">
  <div data-adaptive-host-content>{@render children()}</div>
</div>

<style>
  [data-adaptive-host] { position:relative; width:100%; height:100%; min-height:100dvh; min-width:0; }
  [data-adaptive-host-content] { position:relative; width:calc(100% - var(--surface-dock-reservation)); height:100%; min-width:0; }
</style>
