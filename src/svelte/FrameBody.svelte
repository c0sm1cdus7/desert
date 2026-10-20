<script lang="ts">
  import type { FrameContent } from "../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../interaction/intent.ts";
  import type { BankEvent } from "../interaction/bank-events.ts";
  import { BankVersion } from "../interaction/bank-node.ts";
  import BankRenderer from "./BankRenderer.svelte";
  import Information from "./pieces/Information.svelte";
  import MessageBody from "./pieces/MessageBody.svelte";
  let { content, invoke, edit, messageDialog = false }: { content: FrameContent; messageDialog?: boolean;
    invoke: (intent: SurfaceIntent) => void; edit: (name: string, value: string) => void;
  } = $props();
  function dispatch(event: BankEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
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
  <div class="flex min-w-0 flex-col gap-3" data-utility-actions>
    {#each content.actions as action}
      <BankRenderer node={{ version: BankVersion, kind: "action", action, role: "secondary" }} onevent={dispatch} />
    {/each}
  </div>
{:else}
  <MessageBody {content} {messageDialog} />
{/if}
