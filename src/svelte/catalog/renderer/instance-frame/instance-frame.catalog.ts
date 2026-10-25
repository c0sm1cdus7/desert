// InstanceFrame: the transient frame of one mounted modal instance; it keeps that instance's callbacks after teardown.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InstanceFrameContract } from "./instance-frame.contract.ts";

export const InstanceFrame = defineComposition({
  id: "instance-frame",
  purpose: { key: "instanceFrame.purpose" },
  messages: ["instanceFrame.purpose"],
  owner: { entry: "InstanceFrame.svelte" },
  uses: ["surface-frame"], approval: "none", contract: InstanceFrameContract,
} as const);
