// Slider: one value chosen along a bounded track by dragging, pressing the track or the arrow keys, with a 44px target.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SliderContract } from "./slider.contract.ts";

export const Slider = defineFoundation({
  id: "slider",
  purpose: { key: "slider.purpose" }, messages: ["slider.purpose"],
  owner: { entry: "Slider.svelte", vendor: ["slider"] },
  shape: "none", states: ["default", "disabled"], approval: "required", contract: SliderContract,
} as const);
