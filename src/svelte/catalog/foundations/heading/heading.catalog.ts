// Heading: the title of a lock or onboarding step, a page, a section or a field group. Its meaning (`kind`) picks the type
// role and level; no caller sets a size, a weight, a level or a margin (spacing comes from the parent column's gap).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { HeadingContract } from "./heading.contract.ts";

export const Heading = defineFoundation({
  id: "heading",
  purpose: "A title whose meaning picks its type role and level: display, page, section or field group.",
  owner: { entry: "Heading.svelte", parts: ["heading-content.ts"] },
  shape: "none", states: ["default"],
  variants: { kind: ["display", "page", "section", "group"] },
  approval: "required", contract: HeadingContract,
} as const);
