// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MessageBodyContract } from "./message-body.contract.ts";

export const MessageBody = defineFoundation({
  id: "message-body",
  purpose: "Declared as found at the start of the migration: MessageBody.svelte.",
  owner: { entry: "MessageBody.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: MessageBodyContract,
} as const);
