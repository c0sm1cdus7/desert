// The props of CatalogSearchResults: the destination searched (`title`, and the `description` its prompt shows before a
// query), the `query` and the `results` it found. Choosing a result raises `select` with it.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import type { WorkspaceSearchResult } from "../../../infra/workspace-search.ts";

export const CatalogSearchResultsContract = {
  props: Type.Object({
    title: text,
    description: text,
    query: Type.String(),
    results: Type.Array(Type.Unsafe<WorkspaceSearchResult>()),
  }, { additionalProperties: false }),
  events: Type.Object({ select: Type.Unsafe<WorkspaceSearchResult>() }, { additionalProperties: false }),
} as const;
