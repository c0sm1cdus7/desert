<script lang="ts">
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import ToolbarLayout from "../toolbar-layout/ToolbarLayout.svelte";
  let { searching = false }: { searching?: boolean } = $props();
  const sidebar = Sidebar.useSidebar();
</script>
{#if sidebar.available && !sidebar.expanded}
  <div data-navigation-return><ToolbarLayout edge="bottom" content={{kind:"navigation-toggle",searching,show:true}} /></div>
{/if}
