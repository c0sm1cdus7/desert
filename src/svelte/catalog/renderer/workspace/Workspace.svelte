<script lang="ts">
  import { ViewWorkspace } from "../../../adapter-catalog.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let props: CatalogProps<"workspace"> = $props();
</script>

<ViewWorkspace program={props.program} activeDestination={props.activeDestination}
  resolved={props.resolved} panel={props.panel} error={props.error} uncertain={props.uncertain}
  onevent={props.onevent} onnavigate={props.onnavigate} />
