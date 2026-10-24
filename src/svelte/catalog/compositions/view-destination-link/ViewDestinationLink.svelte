<script lang="ts">
  import { DestinationRow } from "../../index.ts";
  import { GroupedPanel } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { view, output, label, available, onevent, icon, reason }: CatalogProps<"view-destination-link"> = $props();
</script>
<GroupedPanel><div data-grouped-rows>
  <DestinationRow destination={output} {label} {available} {icon} {reason}
    open={() => onevent?.({ kind: "surface.invoke", intent: { kind: "view.output", view, output } })} />
</div></GroupedPanel>
