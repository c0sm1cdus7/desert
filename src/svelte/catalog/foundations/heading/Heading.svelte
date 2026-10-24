<script lang="ts">
  import { currentHeadingOffset, type HeadingLevel } from "../../../infra/heading-context.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { assertHeadingContent } from "./heading-content.ts";

  let { kind, text, align, focusTarget, id, required }: CatalogProps<"heading"> = $props();
  // The contract lists every prop of every kind; the exact combination per kind is checked here against it.
  let content = $derived.by(() => {
    const value = { kind, text, ...align === undefined ? {} : { align }, ...focusTarget === undefined ? {} : { focusTarget },
      ...id === undefined ? {} : { id }, ...required === undefined ? {} : { required } };
    assertHeadingContent(value);
    return value;
  });
  // Literal class names, so the theme's Tailwind scan sees every role; spacing around a heading is its column's gap.
  const roles = { display: "type-display", page: "type-page", section: "type-section", group: "type-caption" } as const;
  const aligns = { start: "text-start", center: "text-center" } as const;
  const offset = currentHeadingOffset();
  let title = $derived(content.kind === "display" || content.kind === "page");
  let tag = $derived(`h${Math.min(6, (title ? 1 : 2) + offset)}` as `h${HeadingLevel}`);
</script>

<svelte:element this={tag} class="min-w-0 break-words {roles[content.kind]} {content.align ? aligns[content.align] : ''}"
  id={content.kind === "section" ? content.id : undefined}
  tabindex={title && content.focusTarget ? -1 : undefined}
  data-place-title={content.kind === "page" ? "" : undefined}>
  {content.text}{#if content.kind === "group" && content.required}<span class="required" aria-hidden="true">*</span>{/if}
</svelte:element>
