<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import ScrollEdges from "./ScrollEdges.svelte";
  import { observePlaceFocus } from "./place-focus.ts";
  import { cn } from "../vendor/utils.js";

  // Renderer-private slots. Products author the closed Place content contract,
  // not HTML/snippets. Navigation and content places share this scroll owner.
  let { top, content, bottom, overlay, owner = $bindable(null), viewport = $bindable(null),
    viewportAttributes = {}, class: className, ...attributes }: {
    top: Snippet; content: Snippet; bottom?: Snippet; overlay?: Snippet;
    owner?: HTMLDivElement | null; viewport?: HTMLDivElement | null;
    viewportAttributes?: HTMLAttributes<HTMLDivElement>;
  } & Omit<HTMLAttributes<HTMLDivElement>, "children"> = $props();
  $effect(() => {
    if (viewport && owner) return observePlaceFocus(viewport, owner);
  });
</script>

<div bind:this={owner} {...attributes} class={cn("place-frame", className)} data-place data-scroll-owner>
  {@render top()}
  <div bind:this={viewport} {...viewportAttributes} class={cn("place-viewport", viewportAttributes.class)}>
    {@render content()}
  </div>
  {@render bottom?.()}
  {@render overlay?.()}
  <ScrollEdges {viewport} {owner} />
</div>
