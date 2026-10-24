<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { NodeRenderer } from "../../index.ts";
  import { SurfaceFrame } from "../../index.ts";
  import { presentSpecimen } from "./specimen-presentation.ts";
  import type { ReadModelScope } from "../../../../web/client/model-scope.ts";
  import { onDestroy } from "svelte";
  import { providePrivateImages } from "../../../infra/private-image-context.ts";
  import { privateImageAccess } from "../../../../web/client/private-images.ts";
  const specimenImages = privateImageAccess(asset => asset.reference === 'a7000000-0000-4000-8000-000000000001'
    ? { valid: () => true, read: async (_variant, signal) => {
      const response = await fetch('/bank-image.svg', { signal });
      if (!response.ok) throw new Error('SPECIMEN_IMAGE_UNAVAILABLE');
      return response.blob();
    } } : undefined);
  providePrivateImages(specimenImages);
  onDestroy(() => specimenImages.close());
  let { id, state: scenario, surface, validateInput, scope }: {
    id: ResolvedNodeId; state: string; surface: HumanSurface; validateInput: ValidateInput; scope: ReadModelScope;
  } = $props();
  let value = $state<string | undefined>();
  let open = $state(false);
  let locked = $state(false);
  let draft = $state<Record<string, string>>({});
  let presentation = $derived(presentSpecimen(id, scenario, surface,
    { ...(value === undefined ? {} : { value }), open, locked, draft }, validateInput, scope));
  function interact(event: NodeEvent) {
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
  <NodeRenderer {node} onevent={interact} />
{/each}
{#if presentation.frame}
  <SurfaceFrame frame={presentation.frame}
    edit={(name, next) => interact({ kind: "input.change", name, value: next })}
    invoke={intent => interact({ kind: "surface.invoke", intent })} />
{/if}
