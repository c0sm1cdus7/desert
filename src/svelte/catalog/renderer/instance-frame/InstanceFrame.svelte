<script lang="ts">
  import { untrack } from "svelte";
  import type { SurfaceFrame as Frame } from "../../../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { ResolvedView } from "../../../../views/resolved.ts";
  import { SurfaceFrame } from "../../../adapter-catalog.ts";
  import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";
  let { frame, body, invoke, edit, controlEvent }: { frame: Frame; body?: ResolvedView | undefined; invoke: (intent: SurfaceIntent) => void;
    edit?: ((name: string, value: string) => void) | undefined;
    controlEvent?: ((event: FormControlEvent) => void) | undefined } = $props();
  // Detached controls must retain their mounted instance's callbacks after teardown.
  const dispatch = untrack(() => invoke), change = untrack(() => edit), controls = untrack(() => controlEvent);
</script>

<SurfaceFrame {frame} {body} invoke={dispatch} edit={change} controlEvent={controls} presentation="transient" />
