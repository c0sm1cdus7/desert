<script lang="ts">
  import type { PublicCatalogExercises } from "../../../../public-catalog/client.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { LocalExerciseContent } from "../../../adapter-catalog.ts";
  let { definition, bodyOnly = false, oncatalog }: {
    definition: PublicCatalogExercises; bodyOnly?: boolean; oncatalog?: (event: NodeEvent) => void;
  } = $props();
</script>

<LocalExerciseContent {definition} {bodyOnly} {oncatalog} />
