<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { currentHeadingOffset, type HeadingLevel } from "./heading-context.ts";
  import { cn } from "../vendor/utils.js";

  let { level = 1, children, class: className, ...attributes }: {
    level?: HeadingLevel;
    children?: Snippet;
  } & Omit<HTMLAttributes<HTMLHeadingElement>, "children"> = $props();
  const offset = currentHeadingOffset();
  let tag = $derived(`h${Math.min(6, level + offset)}` as `h${HeadingLevel}`);
</script>

<svelte:element this={tag} {...attributes} class={cn("min-w-0 break-words", className)}>{@render children?.()}</svelte:element>
