<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { text, kind, weight = "regular", tone = "default", align, inset = "none", live = "off", id }: CatalogProps<"text"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every role, weight, tone, alignment and inset.
  const kinds = { body: "type-body", support: "type-support", caption: "type-caption" } as const;
  const weights = { regular: "", medium: "font-medium" } as const;
  const tones = { default: "", muted: "text-muted-foreground", destructive: "text-destructive-text" } as const;
  const aligns = { start: "text-start", center: "text-center", end: "text-end" } as const;
  const insets = { none: "", row: "px-4" } as const;
</script>

<p class="{kinds[kind]} min-w-0 {weights[weight]} {tones[tone]} {align ? aligns[align] : ''} {insets[inset]}" {id}
  role={live === "polite" ? "status" : live === "assertive" ? "alert" : undefined}>{text}</p>
