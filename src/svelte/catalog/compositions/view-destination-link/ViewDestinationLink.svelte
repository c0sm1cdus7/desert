<script lang="ts">
  import { List, Row } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { view, output, label, available, onevent, icon = "open", reason }: CatalogProps<"view-destination-link"> = $props();
</script>
<List kind="rows" measure="reading">
  <Row {label} leading={{ kind: "face", face: { kind: "icon", icon } }} trailing="chevron" interaction="open" {available} {reason} current={false}
    onopen={() => onevent?.({ kind: "surface.invoke", intent: { kind: "view.output", view, output } })} />
</List>
