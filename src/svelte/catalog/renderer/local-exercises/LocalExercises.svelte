<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { LocalExerciseContent } from "../../../adapter-catalog.ts";
  let { definition, bodyOnly = false, oncatalog }: CatalogProps<"local-exercises"> = $props();
</script>

<LocalExerciseContent {definition} {bodyOnly} {oncatalog} />
