// The props of CatalogWorkspaceContent: the workspace body `content` (the visited views of a program, or the public
// catalog's places, each with its own event handlers) and `searching`, true while search results cover the body.
import { Type } from "@sinclair/typebox";
import type { WorkspaceContent } from "../../../infra/workspace-content.ts";

export const CatalogWorkspaceContentContract = {
  props: Type.Object({
    content: Type.Unsafe<WorkspaceContent>(),
    searching: Type.Boolean(),
  }, { additionalProperties: false }),
} as const;
