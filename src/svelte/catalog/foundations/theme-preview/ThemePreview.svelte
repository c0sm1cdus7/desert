<script lang="ts">
  import { Wallpaper } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { mode, tint, wallpaper }: CatalogProps<"theme-preview"> = $props();
</script>

<!-- A finite miniature of the actual renderer palette, not an unrelated illustration. F1-merge: the utilities
     scheme-light/scheme-dark and tint-* replace the data-appearance-preview and data-tint marks the theme reads. -->
<div class="preview" data-appearance-preview={mode} data-tint={tint} aria-hidden="true">
  <Wallpaper {wallpaper} />
  <div class="preview-navigation" data-material="pane"><span class="preview-line preview-accent"></span><span class="preview-line"></span><span class="preview-line"></span></div>
  <div class="preview-content">
    <span class="preview-glyph type-page">Aa</span>
    <div class="preview-card" data-material="pane"><span class="preview-line"></span><span class="preview-line preview-short"></span></div>
  </div>
</div>

<style>
  .preview { position:relative; display:grid; grid-template-columns:1fr 2fr; gap:.5rem; padding:.625rem; aspect-ratio:1; width:100%; max-width:12rem; min-width:0; overflow:hidden; border-radius:calc(var(--radius) * .7); color:var(--foreground); background:var(--background); }
  .preview-navigation { position:relative; align-self:stretch; border-radius:.375rem; display:grid; align-content:start; gap:.375rem; padding:.375rem; }
  .preview-line { display:block; height:.375rem; border-radius:.125rem; background:var(--muted-foreground); }
  .preview-accent { height:.75rem; background:var(--primary); }
  .preview-content { position:relative; min-width:0; align-self:center; display:grid; gap:.5rem; }
  /* Visual change (design §7.3): the glyph is the page role (it was 600 1.5rem/1.2). */
  .preview-glyph { font-family:var(--font-sans); }
  .preview-card { display:grid; gap:.375rem; padding:.5rem; border-radius:.375rem; }
  .preview-short { width:65%; }
</style>
