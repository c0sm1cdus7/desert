// ControlBench: the bank's interactive control specimens, each a local renderer instance whose events change only
// its own example state and an interaction notice. It provides the file host its specimens read.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ControlBenchContract } from "./control-bench.contract.ts";

export const ControlBench = defineComposition({
  id: "control-bench",
  purpose: { key: "controlBench.purpose" },
  messages: ["controlBench.purpose", "controlBench.interaction", "controlBench.idle", "controlBench.event", "controlBench.released"],
  owner: { entry: "ControlBench.svelte" },
  uses: ["column", "control-renderer", "specimen-group", "specimen-row", "stack-layout", "text", "view-region"],
  approval: "none", contract: ControlBenchContract,
} as const);
