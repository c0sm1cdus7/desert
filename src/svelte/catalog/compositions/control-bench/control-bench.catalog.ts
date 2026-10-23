// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ControlBenchContract } from "./control-bench.contract.ts";

export const ControlBench = defineComposition({
  id: "control-bench",
  purpose: "Declared as found at the start of the migration: ControlBench.svelte.",
  owner: { entry: "ControlBench.svelte" },
  uses: ["control-renderer", "information", "specimen-group", "specimen-row", "stack-layout"], approval: "none", contract: ControlBenchContract,
} as const);
