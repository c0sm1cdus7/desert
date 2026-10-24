<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { CollectionState, List, Row, StackLayout, Status, Text } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { state, resume }: CatalogProps<"attention-list"> = $props();
</script>

  <StackLayout title={say(m.attentionList.title)}>
    {#if state.error}<Text kind="support" live="polite" text={state.error} />{/if}
    {#if !state.loaded}<CollectionState loaded={false} />
    {:else if state.items.length}
      <List kind="rows" measure="overview">
        {#each state.items as item (item.id)}
          <Row label={item.title} description={item.description} leading={{ kind: "attention", required: true }} trailing="chevron"
            interaction="open" available={item.available} current={false} onopen={() => resume(item.id)} />
        {/each}
      </List>
    {:else if !state.error}
      <List kind="rows" measure="reading"><Status tone="neutral" size="regular" heading={false} title={say(m.attentionList.emptyTitle)}
        description={say(m.attentionList.emptyDescription)} /></List>
    {/if}
  </StackLayout>
