<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Column, Gallery, Heading, StackItem, StackLayout, Text, ViewRegion } from "../../index.ts";
  import { catalogPhotos } from "../../../infra/media-source.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, bodyOnly = false, placement = "nested" }: CatalogProps<"catalog-detail"> = $props();
</script>

{#if !bodyOnly}
  <ViewRegion kind="item" id="photograph" label={node.title}>
    {#key node.record}<Gallery photos={catalogPhotos(node.gallery ?? [node.image])} title={node.title} presentation="detail" fit="fill" aspect="fill" />{/key}
  </ViewRegion>
{/if}
<!-- On its own page the detail reads at the place's content inset; inside another page, on that page's axis (its block
     padding only, the stacks at the host's row inset). -->
<Column gap="snug" inset={placement === "page" ? "reading" : "block"} leading={placement === "page"}>
  {#if !bodyOnly}<StackItem placement="content"><Heading kind="page" text={node.title} focusTarget /></StackItem>{/if}
  <ViewRegion kind="item" id="about">
    <!-- The prose reads at the width it read at 79d8322 (third review), not the forms' reading measure. -->
    <Column gap="snug" measure="prose">
      <StackLayout title={say(m.catalogDetail.about)}>
        {#if node.description}<StackItem placement="content"><Text kind="body" text={node.description} wrap="lines" /></StackItem>{/if}
      </StackLayout>
    </Column>
  </ViewRegion>
</Column>
