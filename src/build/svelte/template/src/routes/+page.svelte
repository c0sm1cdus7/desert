<script lang="ts">
  import AccessGate from "@desert/svelte/pieces/AccessGate.svelte";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

<AccessGate {surface} {validateInput} {viewProgram} />
