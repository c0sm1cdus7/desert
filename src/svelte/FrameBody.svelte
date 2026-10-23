<script lang="ts">
  import type { FrameContent } from "../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../interaction/intent.ts";
  import type { BankEvent } from "../interaction/bank-events.ts";
  import { BankVersion } from "../interaction/bank-node.ts";
  import { BankRenderer, Information, MessageBody, UtilityActions } from "./adapter-catalog.ts";
  import { isFormControlEvent, type FormControlEvent } from "../interaction/form-control-event.ts";
  let { content, invoke, edit, messageDialog = false, controlEvent }: { content: FrameContent; messageDialog?: boolean;
    invoke: (intent: SurfaceIntent) => void; edit: (name: string, value: string) => void;
    controlEvent?: ((event: FormControlEvent) => void) | undefined;
  } = $props();
  function dispatch(event: BankEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
    else if (isFormControlEvent(event)) controlEvent?.(event);
    else if (event.kind === "surface.invoke") invoke(event.intent);
  }
</script>
{#if content.kind === "form"}
  <BankRenderer node={{ version: BankVersion, kind: "form", content }} onevent={dispatch} />
{:else if content.kind === "context"}
  <BankRenderer node={{ version: BankVersion, kind: "context", content }} onevent={dispatch} />
{:else if content.kind === "facts"}
  <BankRenderer node={{ version: BankVersion, kind: "fact", details: content }} />
{:else if content.kind === "review"}
  <BankRenderer node={{ version: BankVersion, kind: "review", content }} />
{:else if content.kind === "information"}
  <Information items={content.items} />
{:else if content.kind === "utilities"}
  <UtilityActions actions={content.actions} {invoke} />
{:else}
  <MessageBody {content} {messageDialog} />
{/if}
