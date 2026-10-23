// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessGateContract } from "./access-gate.contract.ts";

export const AccessGate = defineComposition({
  id: "access-gate",
  purpose: "Declared as found at the start of the migration: AccessGate.svelte.",
  owner: { entry: "AccessGate.svelte", parts: ["browser-access-lock.ts"] },
  uses: ["access-screen", "view-product"], approval: "none", contract: AccessGateContract,
} as const);
