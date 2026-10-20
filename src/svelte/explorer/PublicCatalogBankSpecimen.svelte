<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { BankVersion, bankNode, type BankNode } from "../../interaction/bank-node.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import BankRenderer from "../BankRenderer.svelte";
  let { initial, oncatalog }: { initial: BankNode; oncatalog: (event: BankEvent) => void } = $props();
  let node = $state.raw(untrack(() => initial));
  let notice = $state("");
  let release: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(release));
  function interact(event: BankEvent) {
    if (event.kind === "catalog.open" || event.kind === "catalog.back" || event.kind === "catalog.search") oncatalog(event);
    else if (event.kind === "collection.select") oncatalog({ kind: "catalog.open", record: event.id });
    else if (event.kind === "input.change" && (node.kind === "input.text" || node.kind === "input.multiline")) {
      node = bankNode({ ...node, value: event.value });
      notice = "Local writing changed. No product command was invoked.";
    } else if (event.kind === "local.invoke" && event.intent.kind === "specimen") {
      if (event.intent.operation === "open" && (node.kind === "transient" || node.kind === "problem")) {
        node = bankNode({ ...node, open: true });
        if (node.kind === "transient" && node.locked) {
          clearTimeout(release);
          release = setTimeout(() => { if (node.kind === "transient") node = bankNode({ ...node, locked: false }); }, 3000);
        }
      } else notice = "Diagnostic action pressed. No domain effect or acceptance.";
    } else if (event.kind === "transient.close" || event.kind === "problem.close" ||
      (event.kind === "surface.invoke" && (event.intent.kind === "close" || event.intent.kind === "back"))) {
      if (node.kind === "transient" || node.kind === "problem") node = bankNode({ ...node, open: false });
    }
  }
</script>

{#if node.kind === "transient" || node.kind === "problem"}
  <BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
    intent: { kind: "specimen", operation: "open" }, label: `Open ${node.kind} example`, icon: "open", state: "ready" } }} onevent={interact} />
{/if}
<BankRenderer {node} onevent={interact} />
{#if notice}<p role="status" class="type-support">{notice}</p>{/if}
