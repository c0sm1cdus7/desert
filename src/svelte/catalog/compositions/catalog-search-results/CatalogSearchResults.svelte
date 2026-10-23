<script lang="ts" generics="Result extends WorkspaceSearchResult">
  import * as Empty from "@desert/svelte/vendor/components/ui/empty/index.js";
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import Search from "@lucide/svelte/icons/search";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import NodeRenderer from "../../renderer/node-renderer/NodeRenderer.svelte";
  import GroupedPanel from "../../foundations/grouped-panel/GroupedPanel.svelte";
  import type { WorkspaceSearchResult } from "../../../infra/workspace-search.ts";
  let { title, description, query, results, onselect }: {
    title: string; description: string; query: string; results: readonly Result[];
    onselect: (result: Result) => void;
  } = $props();
</script>

<section data-catalog-search-results data-empty={!query.trim()} aria-label={`Search in ${title}`}>
  {#if !query.trim()}
    <Empty.Root data-catalog-search-prompt>
      <Empty.Header>
        <Empty.Media><Search aria-hidden="true" /></Empty.Media>
        <Empty.Title><h1>Search in {title}</h1></Empty.Title>
        <Empty.Description>{description}</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {:else}
    <header data-catalog-search-heading>
      <h1>Results in {title}</h1>
      <p role="status" aria-live="polite" aria-atomic="true">{results.length} {results.length === 1 ? "result" : "results"}</p>
    </header>
    {#if !results.length}
      <Empty.Root><Empty.Header><Empty.Title>No matching results</Empty.Title>
        <Empty.Description>Try another search in {title}.</Empty.Description></Empty.Header></Empty.Root>
    {:else if results[0]?.kind === "record"}
      <div data-catalog-search-items data-result-kind="record">
        {#each results as result (result.id)}
          {#if result.kind === "record"}<div data-search-result={result.id}>
              <NodeRenderer node={result.node} onevent={event => { if (event.kind === "catalog.open") onselect(result); }} />
          </div>{/if}
        {/each}
      </div>
    {:else}
      <GroupedPanel><div data-catalog-search-items data-grouped-rows>
        {#each results as result (result.id)}
          {#if result.kind !== "record"}<div data-search-result={result.id} data-grouped-row>
              <Button variant="row" size="row" data-grouped-action onclick={() => onselect(result)}>
                <span data-search-result-label><span>{result.title}</span><small>{result.description}</small></span>
                <ChevronRight data-icon="inline-end" aria-hidden="true" />
              </Button>
          </div>{/if}
        {/each}
      </div></GroupedPanel>
    {/if}
  {/if}
</section>
