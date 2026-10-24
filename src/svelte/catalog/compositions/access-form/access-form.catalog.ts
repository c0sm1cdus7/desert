// AccessForm: create an identity in two steps (identity, then appearance) or unlock an existing one.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessFormContract } from "./access-form.contract.ts";

export const AccessForm = defineComposition({
  id: "access-form",
  purpose: "Create an identity in two steps, identity then appearance, or unlock an existing one.",
  owner: { entry: "AccessForm.svelte" },
  uses: ["appearance-preferences", "avatar-shuffle", "feedback", "icon", "stack-layout", "text-input"], approval: "required", contract: AccessFormContract,
} as const);
