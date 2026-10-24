<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { kind, measure, label, children }: CatalogProps<"list"> = $props();
</script>

<!-- One shared pane for sibling rows or facts; the rows draw their own hairlines. F1-merge: utility material-pane replaces
     data-material="pane". -->
{#if kind === "facts"}
  <dl class="list list-facts" class:list-reading={measure === "reading"} data-list="facts" data-material="pane" aria-label={label}>
    {@render children?.()}
  </dl>
{:else}
  <div class="list list-rows" class:list-reading={measure === "reading"} data-list="rows" data-material="pane"
    role={label ? "group" : undefined} aria-label={label}>{@render children?.()}</div>
{/if}

<style>
  .list { width:100%; min-width:0; overflow:hidden; border-radius:var(--radius-group); }
  .list-reading { max-width:34rem; }
  .list-rows { display:flex; flex-direction:column; color:var(--card-foreground); }
  /* Fact rows stack their label above the value when the pane is narrow. */
  .list-facts { container:fact-group / inline-size; }
</style>
