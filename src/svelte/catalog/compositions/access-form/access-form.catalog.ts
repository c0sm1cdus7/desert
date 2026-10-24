// AccessForm: create an identity in two steps (identity, then appearance) or unlock an existing one.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessFormContract } from "./access-form.contract.ts";

export const AccessForm = defineComposition({
  id: "access-form",
  purpose: { key: "accessForm.purpose" },
  messages: ["accessForm.purpose", "accessForm.createIdentity", "accessForm.unlock", "accessForm.stepIdentity", "accessForm.stepAppearance",
    "accessForm.shuffleAvatar", "accessForm.headlineIdentity", "accessForm.headlineAppearance", "accessForm.introIdentity",
    "accessForm.introAppearance", "accessForm.identity", "accessForm.displayName", "accessForm.identityName", "accessForm.identityNameHelper",
    "accessForm.password", "accessForm.passwordHelper", "accessForm.backToIdentity", "accessForm.pleaseWait", "accessForm.continue",
    "accessForm.getStarted", "accessForm.footnote"],
  owner: { entry: "AccessForm.svelte" },
  uses: ["action", "appearance-preferences", "avatar", "column", "field", "form", "heading", "inline", "stack-layout", "text"],
  approval: "required", contract: AccessFormContract,
} as const);
