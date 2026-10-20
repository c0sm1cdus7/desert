<script lang="ts">
  import HumanProduct from "@desert/svelte/HumanProduct.svelte";
  import ViewProduct from "@desert/svelte/views/ViewProduct.svelte";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

{#if viewProgram}
  <ViewProduct program={viewProgram} {surface} {validateInput} />
{:else}
  <HumanProduct {surface} {validateInput} />
{/if}
