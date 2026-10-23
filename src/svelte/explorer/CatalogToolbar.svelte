<script lang="ts">
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  let { title, query, onquery, searching, resultsId, onsearch, oncancel, searchAvailable = true }: {
    title: string; query: string; onquery: (query: string) => void; searching: boolean;
    resultsId: string; onsearch: () => void; oncancel: () => void; searchAvailable?: boolean;
  } = $props();
</script>

{#if searchAvailable}
  <ToolbarLayout layer="search" {searching} edge="top"
    content={{kind:"search",title,query,onquery,searching,resultsId,onsearch,oncancel}} />
{/if}
