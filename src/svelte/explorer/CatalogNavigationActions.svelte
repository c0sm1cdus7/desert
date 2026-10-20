<script lang="ts">
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import BankRenderer from "../BankRenderer.svelte";
  import type { ToolbarAction } from "../../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  let { detail = false, onback, topActions = [], invoke }: {
    detail?: boolean; onback?: () => void;
    topActions?: readonly ToolbarAction[]; invoke?: (intent: SurfaceIntent) => void;
  } = $props();
  const sidebar = Sidebar.useSidebar();
</script>

<div data-catalog-navigation-actions>
  {#if !sidebar.expanded}
    <Sidebar.Trigger variant="secondary" size="icon" aria-label="Show navigation" title="Show navigation" />
  {/if}
  {#if detail && onback}
    <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", role: "secondary", action: {
      intent: { kind: "catalog.back" }, label: "Back", icon: "back", state: "ready",
    } }} onevent={event => { if (event.kind === "catalog.back") onback?.(); }} />
  {/if}
  {#each topActions as action}
    <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action, role: "secondary" }}
      onevent={event => { if (event.kind === "surface.invoke") invoke?.(event.intent); }} />
  {/each}
</div>
