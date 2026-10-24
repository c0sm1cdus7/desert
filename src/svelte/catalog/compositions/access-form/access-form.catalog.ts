// AccessForm: create an identity in two steps (identity, then appearance) or unlock an existing one. Its contract stays
// a stub: `preferences` is typed by AppearancePreferences from src/svelte/infra (migration debt).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessFormContract } from "./access-form.contract.ts";

export const AccessForm = defineComposition({
  id: "access-form",
  purpose: "Create an identity in two steps, identity then appearance, or unlock an existing one.",
  owner: { entry: "AccessForm.svelte" },
  uses: ["appearance-preferences", "avatar-shuffle", "feedback", "stack-layout", "text-input"], approval: "required", contract: AccessFormContract,
} as const);
