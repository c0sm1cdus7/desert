// SpeedDial: the overflow trigger of a toolbar and its labelled commands, drawn by the Menu foundation that replaces it.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpeedDialContract } from "./speed-dial.contract.ts";

export const SpeedDial = defineComposition({
  id: "speed-dial",
  purpose: { key: "speedDial.purpose" },
  messages: ["speedDial.purpose", "speedDial.create", "speedDial.more"],
  owner: { entry: "SpeedDial.svelte" },
  uses: ["menu"], approval: "none", contract: SpeedDialContract,
} as const);
