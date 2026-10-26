<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Column, Heading, Inline, NodeRenderer, StackItem, ViewRegion } from "../../index.ts";
  import { currentHeadingOffset, scopeHeadings } from "../../../infra/heading-context.ts";
  let { node, onevent, bodyOnly = false, placement = "nested" }: CatalogProps<"catalog-home"> = $props();
  // This composition has rails but no page heading of its own.
  if (currentHeadingOffset() > 0) scopeHeadings(-1);
</script>

{#if !bodyOnly}
  <ViewRegion kind="item" id="featured" label={node.featured.eyebrow}>
    <StackItem placement={placement === "nested" ? "content" : "surface"}><NodeRenderer node={node.featured} {onevent} /></StackItem>
  </ViewRegion>
{/if}
<!-- The rails sit in a section under the featured entry (or the place heading); each rail is its group's labelled region. -->
<!-- At 79d8322's rhythm (third review): each rail 22px under what precedes it, its title 10px over its cards, its cards
     14px apart. Nested in another page, a rail scrolls edge to edge and its first card stands on the title's margin, the
     axis of the stack's title and featured entry (owner decision V3, 2026-10-25: the approved look; tests/home-rail-bleed.test.ts). -->
<Column gap="airy" inset="section">
  {#each node.groups as group (group.id)}
    <ViewRegion kind="item" id={group.id}>
      <Column gap="cozy" leading={placement === "page"}>
        <Column gap="snug" inset="content"><Heading kind="section" text={group.title} /></Column>
        <Inline gap="near" overflow="scroll" label={group.title}>
          {#each group.items as item (item.record)}<NodeRenderer node={item} {onevent} />{/each}
        </Inline>
      </Column>
    </ViewRegion>
  {/each}
</Column>
