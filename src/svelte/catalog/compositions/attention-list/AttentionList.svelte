<script lang="ts">
  import type { AttentionSnapshot } from "../../../../web/client/attention-feed.ts";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import GroupedPanel from "../../foundations/grouped-panel/GroupedPanel.svelte";
  import StackLayout from "../../foundations/stack-layout/StackLayout.svelte";
  import AttentionIndicator from "../../foundations/attention-indicator/AttentionIndicator.svelte";
  import Feedback from "../../foundations/feedback/Feedback.svelte";
  import * as Empty from '../../../vendor/components/ui/empty/index.js';
  import CollectionState from '../collection-state/CollectionState.svelte';
  let { state, resume }: { state: AttentionSnapshot; resume: (id: string) => void } = $props();
</script>

  <StackLayout title="Attention">
    {#if state.error}<Feedback text={state.error} />{/if}
    {#if !state.loaded}<CollectionState loaded={false} />
    {:else if state.items.length}
      <GroupedPanel measure="overview">
        <div data-grouped-rows>
        {#each state.items as item (item.id)}
          <div data-grouped-row><Button variant="row" size="row" disabled={!item.available} onclick={() => resume(item.id)}>
            <span class="attention-row">
            <AttentionIndicator required={true} />
            <span data-record-copy><strong>{item.title}</strong><span class="fact-label">{item.description}</span></span>
            <span data-control-chevron><ChevronRight aria-hidden="true" /></span>
            </span>
          </Button></div>
        {/each}
        </div>
      </GroupedPanel>
    {:else if !state.error}
      <GroupedPanel><Empty.Root><Empty.Header><Empty.Title>Nothing needs your attention.</Empty.Title>
        <Empty.Description>Items from every module appear here when they need you.</Empty.Description>
      </Empty.Header></Empty.Root></GroupedPanel>
    {/if}
  </StackLayout>

<style>
  .attention-row { display:flex; align-items:center; gap:var(--space-4,1rem); width:100%; }
  [data-record-copy] { display:flex; flex:1; flex-direction:column; gap:var(--title-subtitle-gap,4px); min-width:0; text-align:start; }
</style>
