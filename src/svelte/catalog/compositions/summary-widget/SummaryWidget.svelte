<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { collectionSummary } from '../../../../interaction/collection-summary.ts';
  import { Card, Loading, Meter, Text } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let {node,activate,available=true}:CatalogProps<"summary-widget">=$props();
  const id=$props.id();
  let specification=$derived(node.presentation?.kind==='summary-widget'?node.presentation:undefined);
  let summary=$derived(specification?collectionSummary(node.records,specification):undefined);
  let pending=$derived(!node.loaded&&node.connection!=='offline');
  let offline=$derived(node.connection==='offline');
  let description=$derived([
    ...(pending?[`${id}-loading`]:!node.loaded?[`${id}-reconnect`]:[
      `${id}-total`,...(specification?.truncated?[`${id}-truncated`]:[]),
    ]),
    ...(offline?[`${id}-offline`]:[]),
  ].join(' '));
  // The meter is named by its whole reading, so the card is described by the total and the legend it shows.
  let reading=$derived(specification&&summary?say(m.summaryWidget.reading,{total:String(summary.total),totalLabel:specification.totalLabel,
    legend:summary.segments.map(segment=>say(m.summaryWidget.segment,{count:String(segment.count),label:segment.label})).join(' ')}):'');
</script>

{#if specification && summary}
  <Card presentation="summary" label={say(m.summaryWidget.open,{title:specification.title})} title={specification.title}
    subtitle={specification.description} disabled={!available||node.disabled} describedBy={description} busy={pending}
    attention={false} current={false} onopen={activate}>
    {#if pending}<Loading kind="lines" label={say(m.summaryWidget.loading)} id={`${id}-loading`} />
    {:else if !node.loaded}<Text kind="support" tone="muted" id={`${id}-reconnect`} text={say(m.summaryWidget.reconnect)} />
    {:else}
      <Meter id={`${id}-total`} total={summary.total} totalLabel={specification.totalLabel} label={reading}
        segments={summary.segments.map(segment=>({count:segment.count,label:segment.label}))} />
      {#if specification.truncated}<Text kind="support" tone="muted" id={`${id}-truncated`}
        text={say(m.summaryWidget.truncated,{total:String(summary.total)})} />{/if}
    {/if}
    {#if offline}<Text kind="support" tone="muted" id={`${id}-offline`}
      text={node.loaded?say(m.summaryWidget.offlineLoaded):say(m.summaryWidget.offlineUnavailable)} />{/if}
  </Card>
{/if}
