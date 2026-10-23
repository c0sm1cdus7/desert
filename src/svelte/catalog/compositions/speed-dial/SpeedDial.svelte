<script lang="ts">
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import BankRenderer from "../../renderer/bank-renderer/BankRenderer.svelte";
  import { actionIcons } from "../../../infra/action-icons.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { anchoredTabExit } from "../../../infra/anchored-tab-exit.ts";
  import { intentKey, type SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { ToolbarAction } from "../../../../interaction/toolbar.ts";
  let { actions, open, onchange, invoke, kind = "overflow" }: { actions: readonly ToolbarAction[]; open: boolean; kind?: "create" | "overflow";
    onchange: (open: boolean) => void; invoke: (intent: SurfaceIntent) => void } = $props();
  const instance = $props.id();
  const panelId = `${instance}-actions`;
  dismissWhenInactive(() => onchange(false));
</script>
<Popover.Root {open} onOpenChange={onchange}>
  <span data-speed-dial-trigger><Popover.Trigger>
    {#snippet child({ props })}<BankRenderer node={{version:"desert.bank-node/1",kind:"action",role:"secondary",action:{label:kind === "create" ? "Create" : "More actions",icon:kind === "create" ? "create" : "more",state:"ready",intent:{kind:"transient.open"}}}} actionElementProps={{...props,"aria-controls":open?panelId:undefined}} />{/snippet}
  </Popover.Trigger></span>
  <Popover.Content id={panelId} presentation="speed-dial" align="end" aria-label={kind === "create" ? "Create" : "More actions"}
    onkeydowncapture={event => anchoredTabExit(event,event.currentTarget,()=>onchange(false))}>
    {#each actions as action, index (intentKey(action.intent))}
      {@const Icon = actionIcons[action.icon]}
      <div data-speed-dial-action>
        <span data-material="pane" data-speed-dial-label id={`${instance}-${index}`}>{action.label}</span>
        <Button variant="secondary" size="icon" aria-labelledby={`${instance}-${index}`} disabled={action.state !== "ready"}
          onclick={() => { onchange(false); invoke(action.intent); }}><Icon /></Button>
      </div>
    {/each}
  </Popover.Content>
</Popover.Root>
