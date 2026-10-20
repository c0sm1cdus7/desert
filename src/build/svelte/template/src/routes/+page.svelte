<script lang="ts">
  import HumanProduct from "@desert/svelte/HumanProduct.svelte";
  import { surface, validateInput } from "virtual:desert/surface";
</script>

<HumanProduct {surface} {validateInput} />
