// Identity: the facts of the signed-in identity (display name, identity name, role), or a notice when access is not installed.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { IdentityContract } from "./identity.contract.ts";

export const Identity = defineComposition({
  id: "identity",
  purpose: { key: "identity.purpose" },
  messages: ["identity.purpose", "identity.identity", "identity.displayName", "identity.identityName", "identity.role", "identity.notInstalled"],
  owner: { entry: "Identity.svelte" },
  uses: ["information", "stack-layout", "text"], approval: "none", contract: IdentityContract,
} as const);
