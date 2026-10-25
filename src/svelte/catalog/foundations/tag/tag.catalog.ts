// Tag: one short label as a toned chip (a field's label, a tag control), removable when its owner allows it, or as a
// reference read in text beside its color bullet. It owns the vendor badge family; LabelRail and ReferenceValues are
// rows of tags.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { TagContract } from "./tag.contract.ts";

export const Tag = defineFoundation({
  id: "tag",
  purpose: "Show one label as a toned chip, removable when its owner allows, or a reference as its name beside its color.",
  owner: { entry: "Tag.svelte", mechanisms: ["press-feedback"], parts: ["TagRemove.svelte"], vendor: ["badge"] },
  shape: "none", states: ["known", "unavailable", "removable", "disabled"],
  variants: { presentation: ["chip", "text"], tone: ["neutral", "accent", "success", "warning", "destructive"] },
  stateVariants: { removable: { presentation: ["chip"] }, disabled: { presentation: ["chip"] } },
  variantLimits: { presentation: { text: { tone: [] } } },
  approval: "required", contract: TagContract,
} as const);
