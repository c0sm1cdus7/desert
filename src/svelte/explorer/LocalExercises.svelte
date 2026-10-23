<script lang="ts">
  import type { PublicCatalogExercises } from "../../public-catalog/client.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { LocalExerciseContent } from "../adapter-catalog.ts";
  let { definition, bodyOnly = false, oncatalog }: {
    definition: PublicCatalogExercises; bodyOnly?: boolean; oncatalog?: (event: BankEvent) => void;
  } = $props();
</script>

<LocalExerciseContent {definition} {bodyOnly} {oncatalog} />
