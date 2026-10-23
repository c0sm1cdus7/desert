<script lang="ts">
  import type { Snippet } from "svelte";
  import ScrollEdges from "../scroll-edges/ScrollEdges.svelte";
  import { observePlaceFocus } from "./place-focus.ts";
  import { provideToolbarScroll } from "../../../infra/toolbar-scroll.svelte.ts";

  // Renderer-private slots. Products author the closed Place content contract,
  // not HTML/snippets. Navigation and content places share this scroll owner.
  let { top, content, bottom, overlay, owner = $bindable(null), viewport = $bindable(null),
    landmark = "main", destination, label, searching = false, oncomposition }: {
    top: Snippet; content: Snippet; bottom?: Snippet; overlay?: Snippet;
    owner?: HTMLDivElement | null; viewport?: HTMLDivElement | null;
    landmark?: "main" | "navigation"; destination?: string; label?: string;
    searching?: boolean; oncomposition?: (active: boolean) => void;
  } = $props();
  provideToolbarScroll({ owner: () => owner, viewport: () => viewport });
  $effect(() => {
    if (viewport && owner) return observePlaceFocus(viewport, owner);
  });
</script>

<!-- Programmatic restoration targets only: this expression is -1 or absent, never a tab stop. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div bind:this={owner} class="place-frame" data-place="true" data-scroll-owner="true"
  data-renderer-profile={landmark === "navigation" ? "apple-reference" : undefined}
  data-catalog-navigation={landmark === "navigation" ? "true" : undefined}
  data-catalog-content={landmark === "main" ? "true" : undefined}
  data-destination={destination} role={landmark}
  tabindex={landmark === "main" ? -1 : undefined} aria-label={label}
  oncompositionstart={() => oncomposition?.(true)} oncompositionend={() => oncomposition?.(false)}>
  {@render top()}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Only -1 or absent; no keyboard tab stop.) -->
  <div bind:this={viewport} class="place-viewport"
    data-slot={landmark === "navigation" ? "sidebar-content" : undefined}
    data-catalog-scroll={landmark === "main" ? "" : undefined}
    tabindex={landmark === "main" ? -1 : undefined}
    inert={landmark === "main" ? searching : undefined} aria-hidden={landmark === "main" && searching ? "true" : undefined}>
    {@render content()}
  </div>
  {@render bottom?.()}
  {@render overlay?.()}
  <ScrollEdges {viewport} {owner} />
</div>
