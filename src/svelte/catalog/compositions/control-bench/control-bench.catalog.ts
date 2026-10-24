// ControlBench: the bank's interactive control specimens, each a local renderer instance whose events change only
// its own example state and an interaction notice.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ControlBenchContract } from "./control-bench.contract.ts";

export const ControlBench = defineComposition({
  id: "control-bench",
  purpose: "Exercise every control specimen locally in the bank, reporting each interaction without any product command.",
  owner: { entry: "ControlBench.svelte" },
  uses: ["control-renderer", "information", "specimen-group", "specimen-row", "stack-layout"], approval: "none", contract: ControlBenchContract,
} as const);
