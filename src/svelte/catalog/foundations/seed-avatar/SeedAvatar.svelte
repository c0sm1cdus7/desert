<script lang="ts">
  import * as Avatar from "../../../vendor/components/ui/avatar/index.js";
  import { avatarGeometry } from "../../../infra/avatar-seed.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { seed, label = "Identity avatar", size = "portrait" }: CatalogProps<"seed-avatar"> = $props();
  let geometry = $derived(avatarGeometry(seed));
  const id = $props.id();
</script>
<Avatar.Root {size}>
  <Avatar.Fallback>
    <svg viewBox="0 0 100 100" role="img" aria-label={label} data-avatar-seed={geometry.seed}>
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
  </Avatar.Fallback>
</Avatar.Root>
<style>
  svg { width:100%; height:100%; display:block; }
</style>
