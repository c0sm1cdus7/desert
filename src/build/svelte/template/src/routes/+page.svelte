<script lang="ts">
  import { AccessGate } from "@desert/svelte/catalog/index.ts";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

<AccessGate {surface} {validateInput} {viewProgram} />
