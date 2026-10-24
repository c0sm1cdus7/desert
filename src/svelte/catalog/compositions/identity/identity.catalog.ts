// Identity: the facts of the signed-in identity (display name, identity name, role), or a notice when access is not installed.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { IdentityContract } from "./identity.contract.ts";

export const Identity = defineComposition({
  id: "identity",
  purpose: "Show the signed-in identity's display name, identity name and role, or say that identity access is not installed.",
  owner: { entry: "Identity.svelte" },
  uses: ["feedback", "information", "stack-layout"], approval: "none", contract: IdentityContract,
} as const);
