<script lang="ts">
  import DestinationRow from "./DestinationRow.svelte";
  import GroupedPanel from "./GroupedPanel.svelte";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { ActionIcon } from '../../interaction/action-icon.ts';
  let { view, output, label, available, onevent, icon, reason }: {
    view: string; output: string; label: string; available: boolean; onevent: (event: BankEvent) => void; icon?: ActionIcon | undefined; reason?: string | undefined;
  } = $props();
</script>
<GroupedPanel><div data-grouped-rows>
  <DestinationRow destination={output} {label} {available} {icon} {reason}
    open={() => onevent({ kind: "surface.invoke", intent: { kind: "view.output", view, output } })} />
</div></GroupedPanel>
