<script lang="ts">
  import { currentHeadingOffset, type HeadingLevel } from "../../../infra/heading-context.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { assertHeadingContent } from "./heading-content.ts";

  let { kind, text, focusTarget, id, required }: CatalogProps<"heading"> = $props();
  // The contract lists every prop; the exact combination per kind is checked here, as before.
  let content = $derived.by(() => {
    const value = { kind, text, ...focusTarget === undefined ? {} : { focusTarget }, ...id === undefined ? {} : { id },
      ...required === undefined ? {} : { required } };
    assertHeadingContent(value);
    return value;
  });
  const offset = currentHeadingOffset();
  let level = $derived(content.kind === "page" || content.kind === "document-title" ? 1 : 2);
  let tag = $derived(`h${Math.min(6, level + offset)}` as `h${HeadingLevel}`);
</script>

<svelte:element this={tag} class="min-w-0 break-words" class:type-page={content.kind === "page"}
  class:type-caption={content.kind === "group-label"}
  id={content.kind === "rail-title" ? content.id : undefined}
  tabindex={content.kind === "document-title" || content.kind === "page" && content.focusTarget ? -1 : undefined}
  data-place-title={content.kind === "page" || content.kind === "document-title" ? "" : undefined}
  data-catalog-detail-title={content.kind === "document-title" ? "" : undefined}
  data-catalog-group-title={content.kind === "rail-title" ? "" : undefined}>
  {content.text}{#if content.kind === "group-label" && content.required}<span class="required" aria-hidden="true">*</span>{/if}
</svelte:element>

<style>
  [data-catalog-group-title] { margin:0 var(--place-content-inset,42px) 10px; font:var(--text-title--font-weight) var(--text-title)/var(--text-title--line-height) var(--font-sans); }
  [data-catalog-detail-title] { margin:0 0 8px; font:var(--text-title--font-weight) var(--text-page)/var(--text-page--line-height) var(--font-sans); outline:none; }
</style>
