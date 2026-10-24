// Separator: a hairline in the separator ink between the pieces of a column or a row, optionally inset like grouped rows.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SeparatorContract } from "./separator.contract.ts";

export const Separator = defineFoundation({
  id: "separator",
  purpose: "Draw a hairline in the separator ink between the pieces of a column or a row, optionally inset like grouped rows.",
  owner: { entry: "Separator.svelte" },
  shape: "none", states: ["default"],
  variants: { orientation: ["horizontal", "vertical"], inset: ["none", "row"] },
  approval: "required", contract: SeparatorContract,
} as const);
