<script lang="ts">
  import { untrack } from "svelte";
  import { SurfaceFrame } from "../../../adapter-catalog.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { frame, body, invoke, edit, controlEvent }: CatalogProps<"instance-frame"> = $props();
  // Detached controls must retain their mounted instance's callbacks after teardown.
  const dispatch = untrack(() => invoke), change = untrack(() => edit), controls = untrack(() => controlEvent);
</script>

<SurfaceFrame {frame} {body} invoke={dispatch} edit={change} controlEvent={controls} presentation="transient" />
