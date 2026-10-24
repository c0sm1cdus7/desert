// Heading: the title of a page, a document, a rail group or a field group. Its meaning (`kind`) picks the type role;
// no caller sets a size, a weight or a level.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { HeadingContract } from "./heading.contract.ts";

export const Heading = defineFoundation({
  id: "heading",
  purpose: "A title whose meaning picks its type role and level: page, document, rail group or field group.",
  owner: { entry: "Heading.svelte", parts: ["heading-content.ts"] },
  shape: "none", states: ["default"],
  variants: { kind: ["page", "document-title", "rail-title", "group-label"] },
  approval: "required", contract: HeadingContract,
} as const);
