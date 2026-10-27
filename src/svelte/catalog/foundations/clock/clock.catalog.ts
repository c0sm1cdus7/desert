// Clock: today's date and the current time, large, kept current while it is shown (the lock screen's).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ClockContract } from "./clock.contract.ts";

export const Clock = defineFoundation({
  id: "clock",
  purpose: { key: "clock.purpose" }, messages: ["clock.purpose"],
  owner: { entry: "Clock.svelte" },
  shape: "none", states: ["default"],
  approval: "required", contract: ClockContract,
} as const);
