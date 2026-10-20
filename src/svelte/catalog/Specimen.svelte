<script lang="ts">
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import type { HumanSurface, ValidateInput } from "../../web/types.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import SurfaceFrame from "../SurfaceFrame.svelte";
  import { presentSpecimen } from "./specimen-presentation.ts";
  let { id, state: scenario, surface, validateInput }: {
    id: PrimitiveId; state: string; surface: HumanSurface; validateInput: ValidateInput;
  } = $props();
  let value = $state<string | undefined>();
  let open = $state(false);
  let locked = $state(false);
  let draft = $state<Record<string, string>>({});
  let presentation = $derived(presentSpecimen(id, scenario, surface,
    { ...(value === undefined ? {} : { value }), open, locked, draft }, validateInput));
  function interact(event: BankEvent) {
    if (event.kind === "input.change") {
      if (id === "form") draft = { ...draft, [event.name]: event.value };
      else value = event.value;
    } else if (event.kind === "local.invoke" && event.intent.kind === "specimen") {
      if (event.intent.operation === "press") value = "Pressed";
      else if (event.intent.operation === "open") { locked = scenario === "locked"; open = true; }
    } else if (event.kind === "collection.select") open = true;
    else if (event.kind === "transient.close" || event.kind === "problem.close") open = false;
    else if (event.kind === "surface.invoke") {
      if (event.intent.kind === "close" || event.intent.kind === "back") open = false;
      else if (event.intent.kind === "accept") locked = false;
    }
  }
</script>
{#each presentation.nodes as node, index (index)}
  <BankRenderer {node} onevent={interact} />
{/each}
{#if presentation.frame}
  <SurfaceFrame frame={presentation.frame}
    edit={(name, next) => interact({ kind: "input.change", name, value: next })}
    invoke={intent => interact({ kind: "surface.invoke", intent })} />
{/if}
