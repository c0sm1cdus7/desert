// Fields: the fields of a form frame, each mounted through the node renderer.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FieldsContract } from "./fields.contract.ts";

export const Fields = defineComposition({
  id: "fields",
  purpose: "Mount each field of a form frame through the node renderer and report its edits and control events.",
  owner: { entry: "Fields.svelte" },
  uses: ["node-renderer"], renders: ["form"], approval: "none", contract: FieldsContract,
} as const);
