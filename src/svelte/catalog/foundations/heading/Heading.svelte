<script lang="ts">
  import { useFocusScope } from "../../../infra/focus-scope.ts";
  import { currentHeadingOffset, type HeadingLevel } from "../../../infra/heading-context.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { assertHeadingContent } from "./heading-content.ts";

  let { kind, text, align, focusTarget, focusKey, id, required }: CatalogProps<"heading"> = $props();
  // The contract lists every prop of every kind; the exact combination per kind is checked here against it.
  let content = $derived.by(() => {
    const value = { kind, text, ...align === undefined ? {} : { align }, ...focusTarget === undefined ? {} : { focusTarget },
      ...focusKey === undefined ? {} : { focusKey }, ...id === undefined ? {} : { id }, ...required === undefined ? {} : { required } };
    assertHeadingContent(value);
    return value;
  });
  // Literal class names, so the theme's Tailwind scan sees every role; spacing around a heading is its column's gap.
  const roles = { display: "type-display", page: "type-page", section: "type-section", group: "type-caption" } as const;
  const aligns = { start: "text-start", center: "text-center" } as const;
  const offset = currentHeadingOffset();
  const scope = useFocusScope();
  let element = $state<HTMLElement | null>(null);
  let title = $derived(content.kind === "display" || content.kind === "page");
  let focusable = $derived(title && (content.focusTarget === true || content.focusKey !== undefined));
  let keyed = $derived((content.kind === "display" || content.kind === "page") && content.focusKey !== undefined);
  let tag = $derived(`h${Math.min(6, (title ? 1 : 2) + offset)}` as `h${HeadingLevel}`);
  // A keyed title answers its scope's focus(key): it takes focus without scrolling and says whether it holds it. Focus
  // moves there programmatically (a step changed), so, like a place title, it draws no focus ring.
  $effect(() => {
    const key = content.kind === "display" || content.kind === "page" ? content.focusKey : undefined, target = element;
    if (!scope || key === undefined || !target) return;
    return scope.register(key, () => { target.focus({ preventScroll: true }); return document.activeElement === target; });
  });
</script>

<svelte:element this={tag} bind:this={element} class="min-w-0 break-words {roles[content.kind]} {content.align ? aligns[content.align] : ''} {keyed ? 'outline-none' : ''} {content.kind === 'group' && content.required ? 'required-mark' : ''}"
  id={content.kind === "section" ? content.id : undefined}
  tabindex={focusable ? -1 : undefined}
  data-place-title={content.kind === "page" ? "" : undefined}>
  {content.text}
</svelte:element>
