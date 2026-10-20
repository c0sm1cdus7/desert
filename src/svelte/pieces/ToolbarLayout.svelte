<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Face as ToolbarFace } from "../../interaction/face.ts";
  import Face from "./Face.svelte";
  import { cn } from "../vendor/utils.js";

  // Renderer composition only: products supply typed identity/actions, never snippets.
  let { face, children, support, row = $bindable(null), stacked = false, edge = "top", class: className,
    ...attributes }: {
    face?: ToolbarFace | undefined; children: Snippet; support?: Snippet; row?: HTMLDivElement | null; stacked?: boolean;
    edge?: "top" | "bottom";
  } & Omit<HTMLAttributes<HTMLElement>, "children"> = $props();
</script>

<header {...attributes} class={cn("shrink-0", className)} data-piece="toolbar" data-toolbar={edge}>
  {#if face}
    <div class="toolbar-face flex justify-center" data-toolbar-face><Face {face} /></div>
  {/if}
  <div bind:this={row} class={cn("toolbar-row flex min-w-0 items-center", stacked && "flex-wrap")}
    data-toolbar-layout={stacked ? "stacked" : "inline"}>
    {@render children()}
  </div>
  {@render support?.()}
</header>
