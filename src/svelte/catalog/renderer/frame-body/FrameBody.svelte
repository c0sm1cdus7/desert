<script lang="ts">
  import type { FrameContent } from "../../../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { NodeRenderer, Information, MessageBody, UtilityActions } from "../../../adapter-catalog.ts";
  import { isFormControlEvent, type FormControlEvent } from "../../../../interaction/form-control-event.ts";
  let { content, invoke, edit, messageDialog = false, controlEvent }: { content: FrameContent; messageDialog?: boolean;
    invoke: (intent: SurfaceIntent) => void; edit: (name: string, value: string) => void;
    controlEvent?: ((event: FormControlEvent) => void) | undefined;
  } = $props();
  function dispatch(event: NodeEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
    else if (isFormControlEvent(event)) controlEvent?.(event);
    else if (event.kind === "surface.invoke") invoke(event.intent);
  }
</script>
{#if content.kind === "form"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "form", content }} onevent={dispatch} />
{:else if content.kind === "context"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "context", content }} onevent={dispatch} />
{:else if content.kind === "facts"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details: content }} />
{:else if content.kind === "review"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "review", content }} />
{:else if content.kind === "information"}
  <Information items={content.items} />
{:else if content.kind === "utilities"}
  <UtilityActions actions={content.actions} {invoke} />
{:else}
  <MessageBody {content} {messageDialog} />
{/if}
