<script lang="ts">
  import DestinationRow from "../../foundations/destination-row/DestinationRow.svelte";
  import GroupedPanel from "../../foundations/grouped-panel/GroupedPanel.svelte";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import type { ActionIcon } from '../../../../interaction/action-icon.ts';
  let { view, output, label, available, onevent, icon, reason }: {
    view: string; output: string; label: string; available: boolean; onevent: (event: NodeEvent) => void; icon?: ActionIcon | undefined; reason?: string | undefined;
  } = $props();
</script>
<GroupedPanel><div data-grouped-rows>
  <DestinationRow destination={output} {label} {available} {icon} {reason}
    open={() => onevent({ kind: "surface.invoke", intent: { kind: "view.output", view, output } })} />
</div></GroupedPanel>
