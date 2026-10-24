// InstanceFrame: the transient frame of one mounted drawer instance; it keeps that instance's callbacks after teardown.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InstanceFrameContract } from "./instance-frame.contract.ts";

export const InstanceFrame = defineComposition({
  id: "instance-frame",
  purpose: "Draw the transient frame of one mounted instance, keeping its callbacks through teardown.",
  owner: { entry: "InstanceFrame.svelte" },
  uses: ["surface-frame"], approval: "none", contract: InstanceFrameContract,
} as const);
