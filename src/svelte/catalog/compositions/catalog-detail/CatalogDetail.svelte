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
<Column gap="snug" inset="reading" leading={placement === "page"}>
  {#if !bodyOnly}<StackItem placement="content"><Heading kind="page" text={node.title} focusTarget /></StackItem>{/if}
  <ViewRegion kind="item" id="about">
    <Column gap="snug" measure="reading">
      <StackLayout title={say(m.catalogDetail.about)}>
        {#if node.description}<StackItem placement="content"><Text kind="body" text={node.description} wrap="lines" /></StackItem>{/if}
      </StackLayout>
    </Column>
  </ViewRegion>
</Column>
