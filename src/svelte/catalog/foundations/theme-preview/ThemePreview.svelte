<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Wallpaper } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { tintClass } from "../../../infra/appearance-preferences.ts";
  let { mode, tint, wallpaper }: CatalogProps<"theme-preview"> = $props();
  // The theme's scheme utilities, written literally so the theme's Tailwind scan sees both.
  const schemes = { light: "scheme-light", dark: "scheme-dark" } as const;
</script>

<!-- A finite miniature of the actual renderer palette, not an unrelated illustration: the theme's scheme and tint
     utilities give it the chosen mode's tokens. -->
<div class="preview {schemes[mode]} {tintClass[tint]}" data-appearance-preview={mode} aria-hidden="true">
  <Wallpaper {wallpaper} />
  <div class="preview-navigation material-pane"><span class="preview-line preview-accent"></span><span class="preview-line"></span><span class="preview-line"></span></div>
  <div class="preview-content">
    <span class="preview-glyph type-page">{say(m.themePreview.glyph)}</span>
    <div class="preview-card material-pane"><span class="preview-line"></span><span class="preview-line preview-short"></span></div>
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
