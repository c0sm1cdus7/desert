<script lang="ts">
  import { Popover } from "../../index.ts";
  import { Action } from "../../index.ts";
  import { intentKey } from "../../../../interaction/intent.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, icon, actions, open, align, onopenchange, oninvoke }: CatalogProps<"menu"> = $props();
</script>
<Popover {label} {open} disabled={false} locked={false} content="menu" placement="anchored" {align}
  trigger={{ kind: "action", label, icon, face: "icon", emphasis: "secondary", state: "ready" }} {onopenchange}>
  {#each actions as action (intentKey(action.intent))}
    <div data-menu-action>
      <span data-material="pane" data-menu-label aria-hidden="true">{action.label}</span>
      <Action label={action.label} icon={action.icon} face="icon" emphasis="secondary" state={action.state} reason={action.reason}
        onclick={() => { onopenchange?.(false); oninvoke?.(action.intent); }} />
    </div>
  {/each}
</Popover>
