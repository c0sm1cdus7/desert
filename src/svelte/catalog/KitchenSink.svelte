<script lang="ts">
  import { InteractionCatalog } from "../../interaction/catalog.ts";
  import type { HumanSurface, ValidateInput } from "../../web/types.ts";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import InspectionContent from "../views/InspectionContent.svelte";
  let { surface, validateInput, back }: { surface: HumanSurface; validateInput: ValidateInput; back: () => void } = $props();
</script>
<main class="catalog mx-auto flex w-full min-w-0 max-w-[52rem] flex-col gap-8">
  <ToolbarLayout identity={{title:"DESERT renderer catalog",subtitle:`${InteractionCatalog.id} · ${InteractionCatalog.version} · shadcn-svelte`}}
    content={{kind:"actions",actions:[{intent:{kind:"catalog",open:false},icon:"back",label:"Back to product",state:"ready"}],onevent:back}} />
  <InspectionContent />
</main>
