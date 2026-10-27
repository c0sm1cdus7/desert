<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { text, kind, weight = "regular", tone = "default", align, inset = "none", live = "off", id, wrap }: CatalogProps<"text"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every role, weight, tone, alignment and inset.
  const kinds = { body: "type-body", support: "type-support", caption: "type-caption" } as const;
  const weights = { regular: "", medium: "font-medium" } as const;
  const tones = { default: "", muted: "text-muted-foreground", destructive: "text-destructive-text" } as const;
  const aligns = { start: "text-start", center: "text-center", end: "text-end" } as const;
  const insets = { none: "", row: "px-(--row-inset)" } as const;
  // Every paragraph's words wrap by the one text policy (wrap-words): a long word (a name) breaks at a syllable with its
  // hyphen on a narrow page, and only where it must as the last resort, never past its column; `lines` also keeps the copy's
  // line breaks and lets it be selected.
  const wraps = { anywhere: "", lines: "whitespace-pre-line select-text" } as const;
</script>

<p class="{kinds[kind]} min-w-0 wrap-words {weights[weight]} {tones[tone]} {align ? aligns[align] : ''} {insets[inset]} {wrap ? wraps[wrap] : ''}" {id}
  role={live === "polite" ? "status" : live === "assertive" ? "alert" : undefined}>{text}</p>
