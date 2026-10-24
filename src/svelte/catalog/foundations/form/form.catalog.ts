// Form: a labelled group of fields submitted together; submitting runs the caller's submit and never reloads the page.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FormContract } from "./form.contract.ts";

export const Form = defineFoundation({
  id: "form",
  purpose: "Submit a labelled group of fields together, from any of its fields or its submit action.",
  owner: { entry: "Form.svelte" },
  shape: "none", states: ["default"],
  slots: { children: { accepts: ["stack-layout", "text-input", "action"] } },
  approval: "required", contract: FormContract,
} as const);
