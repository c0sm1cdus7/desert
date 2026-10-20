<script lang="ts">
  import { InteractionCatalog } from "../../interaction/catalog.ts";
  import type { HumanSurface, ValidateInput } from "../../web/types.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import InspectionContent from "../views/InspectionContent.svelte";
  let { surface, validateInput, back }: { surface: HumanSurface; validateInput: ValidateInput; back: () => void } = $props();
</script>
<main class="catalog mx-auto flex w-full min-w-0 max-w-[52rem] flex-col gap-8">
  <ToolbarLayout class="catalog-header"><div class="flex flex-col gap-2"><h1 class="type-page">DESERT renderer catalog</h1>
    <p class="type-caption text-muted-foreground">{InteractionCatalog.id} · {InteractionCatalog.version} · shadcn-svelte</p></div>
    <BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
      intent: { kind: "catalog", open: false }, icon: "back", label: "Back to product", state: "ready" } }} onevent={back} /></ToolbarLayout>
  <InspectionContent />
</main>
