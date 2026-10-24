<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { List, Row } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { signals }: CatalogProps<"attention-status"> = $props();
</script>
{#if signals.length}
  <List kind="rows" measure="reading">
    <Row interaction="static" leading={{ kind: "attention", required: true }} trailing="none" available current={false}
      label={signals.length === 1 ? say(m.attentionStatus.one) : say(m.attentionStatus.many, { count: String(signals.length) })} />
  </List>
{/if}
