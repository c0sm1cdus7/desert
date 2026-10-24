<script lang="ts">
  import { ThemePreview } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  // AppearancePreview is ThemePreview (the foundation owns the miniature); this folder stays until Batch 3 prunes it.
  let { mode, tint, wallpaper }: CatalogProps<"appearance-preview"> = $props();
</script>
<ThemePreview {mode} {tint} {wallpaper} />
