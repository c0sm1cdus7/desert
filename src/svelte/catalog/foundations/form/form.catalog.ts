// Form: a labelled group of fields submitted together; submitting runs the caller's submit and never reloads the page.
// A filling form takes its surface's remaining height (a frame's form between its toolbars).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FormContract } from "./form.contract.ts";

export const Form = defineFoundation({
  id: "form",
  purpose: "Submit a labelled group of fields together, from any of its fields or its submit action.",
  owner: { entry: "Form.svelte" },
  shape: "none", states: ["default", "filling"],
  slots: { children: { accepts: ["stack-layout", "field", "action", "column"] } },
  approval: "required", contract: FormContract,
} as const);
