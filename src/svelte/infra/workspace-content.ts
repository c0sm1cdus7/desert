import type { OwnedResolvedView, OwnedResolvedPanel, OwnedViewEvent } from "../../web/client/view-events.ts";
import type { ResolvedNodeId } from "../../interaction/catalog.ts";
import type { NodeEvent } from "../../interaction/node-events.ts";
import type { PublicCatalogSurface, projectPublicCatalog } from "../../public-catalog/client.ts";
import type { CatalogDestination, CatalogSearchResult } from "./catalog-search.ts";
import type { WorkspaceSearchResult } from "./workspace-search.ts";

export type WorkspaceContentActions = {
  readonly revealEntry: (id: ResolvedNodeId) => Promise<void>;
  readonly selectMedia: (record: string) => boolean;
};
export type RegisterContentActions = (actions: WorkspaceContentActions | null) => void;
export type WorkspaceViewportActions = {
  readonly scrollToTop: () => void;
  readonly scrollTop: () => number;
  readonly focusTitle: () => void;
  readonly restoreRecord: (top: number, view: string, record: string) => void;
  readonly revealItem: (id: string) => void;
};
export type WorkspacePanels = {
  readonly panel?: OwnedResolvedPanel | null;
  readonly error: string | null;
  readonly uncertain: boolean;
  readonly onevent: (event: OwnedViewEvent) => void;
  readonly dismissError: () => void;
};

/** Private finite workspace bodies. Events are semantic operations, never render functions. */
export type WorkspaceContent = {
  readonly kind: "view-program";
  readonly visited: readonly OwnedResolvedView[];
  readonly activeView: string;
  readonly albums: Readonly<Record<string, { readonly album: string | null }>>;
  readonly onevent: (event: OwnedViewEvent) => void;
  readonly onalbum: (id: string) => void;
  readonly onactions: (view: string, actions: WorkspaceContentActions | null) => void;
} | {
  readonly kind: "public-catalog";
  readonly surface: PublicCatalogSurface;
  readonly projected: ReturnType<typeof projectPublicCatalog>["content"];
  readonly active: CatalogDestination;
  readonly selected: string | null;
  readonly bankVisited: boolean;
  readonly onevent: (event: NodeEvent) => void;
  readonly onactions: RegisterContentActions;
};

export type WorkspaceSearch = {
  readonly title: string; readonly description: string;
} & ({ readonly kind: "catalog"; readonly results: readonly CatalogSearchResult[];
  readonly onselect: (result: CatalogSearchResult) => void }
  | { readonly kind: "view"; readonly results: readonly WorkspaceSearchResult[];
    readonly onselect: (result: WorkspaceSearchResult) => void });
