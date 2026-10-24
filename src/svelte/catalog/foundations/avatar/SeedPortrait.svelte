<script lang="ts">
  import { avatarGeometry } from "../../../infra/avatar-seed.ts";
  // The seed alone decides the drawing: four bands over a base colour, rotated, under a light glaze.
  let { seed, label }: { seed: string; label: string | undefined } = $props();
  let geometry = $derived(avatarGeometry(seed));
  const id = $props.id();
</script>
<svg class="seed-portrait" viewBox="0 0 100 100" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : "true"}
  data-avatar-seed={geometry.seed}>
  <defs><clipPath id={`${id}-clip`}><circle cx="50" cy="50" r="50" /></clipPath>
    <linearGradient id={`${id}-glaze`} x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".16" /><stop offset="1" stop-color="#000" stop-opacity=".16" /></linearGradient></defs>
  <g clip-path={`url(#${id}-clip)`}>
    <rect width="100" height="100" fill={geometry.colors[0]} />
    <g transform={`rotate(${geometry.rotation} 50 50)`}>
      {#each [0, 1, 2, 3] as band}
        <path d={`M-40 ${(band - 1) * 28} C20 ${((band - 1) * 28) - 60} 45 ${((band - 1) * 28) + 85} 140 ${((band - 1) * 28) + 25} L140 140 L-40 140Z`} fill={geometry.colors[(band + 1) % 4]} />
      {/each}
    </g>
    <rect width="100" height="100" fill={`url(#${id}-glaze)`} />
  </g>
</svg>
<style>
  .seed-portrait { width:100%; height:100%; display:block; }
</style>
