<script lang="ts">
  import { Wallpaper } from "../../index.ts";
  import type { AppearancePreferences } from "../../../infra/appearance-preferences.ts";
  let { mode, tint, wallpaper }: {
    mode: "light" | "dark"; tint: AppearancePreferences["tint"]; wallpaper: AppearancePreferences["wallpaper"];
  } = $props();
</script>

<!-- A finite miniature of the actual renderer palette, not an unrelated illustration. -->
<div class="appearance-preview" data-appearance-preview={mode} data-tint={tint} aria-hidden="true">
  <Wallpaper {wallpaper} />
  <div class="appearance-preview-navigation" data-material="pane"><span></span><span></span><span></span></div>
  <div class="appearance-preview-content"><strong>Aa</strong><div data-material="pane"><span></span><span></span></div></div>
</div>

<style>
  .appearance-preview { position:relative; display:grid; grid-template-columns:1fr 2fr; gap:.5rem; padding:.625rem; aspect-ratio:1; width:100%; max-width:12rem; min-width:0; overflow:hidden; border-radius:calc(var(--radius) * .7); color:var(--foreground); background:var(--background); }
  .appearance-preview-navigation { position:relative; align-self:stretch; border-radius:.375rem; display:grid; align-content:start; gap:.375rem; padding:.375rem; }
  .appearance-preview-navigation span { height:.375rem; border-radius:.125rem; background:var(--muted-foreground); }
  .appearance-preview-navigation span:first-child { height:.75rem; background:var(--primary); }
  .appearance-preview-content { position:relative; min-width:0; align-self:center; display:grid; gap:.5rem; }
  strong { font:600 1.5rem/1.2 var(--font-sans); }
  .appearance-preview-content div { display:grid; gap:.375rem; padding:.5rem; border-radius:.375rem; }
  .appearance-preview-content span { height:.375rem; border-radius:.125rem; background:var(--muted-foreground); }
  .appearance-preview-content span:last-child { width:65%; }
</style>
