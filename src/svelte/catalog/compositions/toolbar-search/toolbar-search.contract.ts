// The props of ToolbarSearch: the search content of a toolbar (title, query, whether it is searching, the results it
// controls, and the query, open and cancel callbacks).
import { Type } from "@sinclair/typebox";
import type { ToolbarContent } from "../../../infra/toolbar-content.ts";

export const ToolbarSearchContract = {
  props: Type.Object({
    content: Type.Unsafe<Extract<ToolbarContent, { kind: "search" }>>(),
  }, { additionalProperties: false }),
} as const;
