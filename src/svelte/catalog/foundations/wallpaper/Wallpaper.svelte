<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { wallpaper, preview = false }: CatalogProps<"wallpaper"> = $props();
</script>
<div class="system-wallpaper" class:wallpaper-preview={preview} data-system-wallpaper={wallpaper} aria-hidden="true">
  {#if wallpaper === "silk"}<svg class="wallpaper-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">
    {#each Array.from({ length: 90 }, (_, index) => index) as line}<path d={`M${-650 + line * 16} -200 C${50 + line * 16} 430 ${-620 + line * 16} 500 ${450 + line * 16} 1200`} />{/each}
  </svg>{/if}
</div>
<style>
  .system-wallpaper { position:absolute; inset:0; pointer-events:none; overflow:hidden; background:var(--wallpaper-base, light-dark(#e8ecf1,#171b22)); }
  .wallpaper-preview { position:relative; width:100%; aspect-ratio:1.5; border-radius:calc(var(--radius) * .7); }
  [data-system-wallpaper="mist"] { background:radial-gradient(ellipse at 8% 75%,light-dark(#b8ced7,#254451),transparent 75%),radial-gradient(ellipse at 95% 15%,light-dark(#cec2d8,#444151),transparent 75%),var(--wallpaper-base,light-dark(#e8ecf1,#171b22)); }
  [data-system-wallpaper="silk"] { background:linear-gradient(135deg,light-dark(#d8e1ee,#242b38),var(--wallpaper-base,light-dark(#e8ecf1,#171b22)) 46%,light-dark(#ccd4df,#343843)); }
  .wallpaper-lines { width:100%; height:100%; stroke:light-dark(#ffffff5c,#a0bce419); fill:none; stroke-width:1; }
  .system-wallpaper::after { content:""; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 34%,light-dark(#e8ecf199,#171b2299),transparent 75%); }
</style>
