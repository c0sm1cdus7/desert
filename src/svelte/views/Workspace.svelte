<script lang="ts">
  import { ViewWorkspace } from "../adapter-catalog.ts";
  import type { WorkspaceProps } from "./types.ts";
  let props: WorkspaceProps = $props();
</script>

<ViewWorkspace program={props.program} activeDestination={props.activeDestination}
  resolved={props.resolved} panel={props.panel} error={props.error} uncertain={props.uncertain}
  onevent={props.onevent} onnavigate={props.onnavigate} />
