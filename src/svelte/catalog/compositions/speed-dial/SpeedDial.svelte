<script lang="ts">
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { NodeRenderer } from "../../index.ts";
  import { Icon } from "../../index.ts";
  import { actionIconNames } from "../../../infra/action-icons.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { anchoredTabExit } from "../../../infra/anchored-tab-exit.ts";
  import { intentKey } from "../../../../interaction/intent.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { actions, open, onchange, invoke, kind = "overflow" }: CatalogProps<"speed-dial"> = $props();
  const instance = $props.id();
  const panelId = `${instance}-actions`, triggerId = `${instance}-trigger`;
  dismissWhenInactive(() => onchange?.(false));
</script>
<Popover.Root {open} onOpenChange={onchange}>
  <span data-speed-dial-trigger><NodeRenderer node={{version:"desert.bank-node/1",kind:"action",role:"secondary",action:{label:kind === "create" ? "Create" : "More actions",icon:kind === "create" ? "create" : "more",state:"ready",intent:{kind:"transient.open"}}}}
    actionDisclosure={{id:triggerId,controls:panelId,expanded:open,haspopup:"dialog"}}
    onevent={event => { if (event.kind === "local.invoke" && event.intent.kind === "transient.open") onchange?.(!open); }} /></span>
  <Popover.Content id={panelId} customAnchor={`#${triggerId}`} presentation="speed-dial" align="end" aria-label={kind === "create" ? "Create" : "More actions"}
    onkeydowncapture={event => anchoredTabExit(event,event.currentTarget,()=>onchange?.(false))}>
    {#each actions as action, index (intentKey(action.intent))}
      <div data-speed-dial-action>
        <span class="material-pane" data-speed-dial-label id={`${instance}-${index}`}>{action.label}</span>
        <Button variant="secondary" size="icon" aria-labelledby={`${instance}-${index}`} disabled={action.state !== "ready"}
          onclick={() => { onchange?.(false); invoke(action.intent); }}><Icon name={actionIconNames[action.icon]} /></Button>
      </div>
    {/each}
  </Popover.Content>
</Popover.Root>
