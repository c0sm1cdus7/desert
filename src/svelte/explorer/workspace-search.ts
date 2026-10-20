import type { CatalogSearchResult } from "./catalog-search.ts";

/** Shared search rows. Providers own data and activation, never their appearance. */
export type WorkspaceSearchResult = CatalogSearchResult |
  { readonly kind: "content"; readonly id: string; readonly title: string; readonly description: string };
