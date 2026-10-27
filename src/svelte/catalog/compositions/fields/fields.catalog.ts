// Fields: the fields of a form frame, 1.25rem apart, each mounted through the node renderer.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FieldsContract } from "./fields.contract.ts";

export const Fields = defineComposition({
  id: "fields",
  purpose: { key: "fields.purpose" },
  messages: ["fields.purpose"],
  owner: { entry: "Fields.svelte" },
  uses: ["column", "node-renderer"], renders: ["form"], approval: "none", contract: FieldsContract,
} as const);
