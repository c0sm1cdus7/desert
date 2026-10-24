// AccessGate: the product entry. It runs the access client and shows the access screen until a session is ready,
// then mounts the view product for that session.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessGateContract } from "./access-gate.contract.ts";

export const AccessGate = defineComposition({
  id: "access-gate",
  purpose: "Hold the product behind access: show the access screen until a session is ready, then the view product.",
  owner: { entry: "AccessGate.svelte", parts: ["browser-access-lock.ts"] },
  uses: ["access-screen", "view-product"], approval: "none", contract: AccessGateContract,
} as const);
