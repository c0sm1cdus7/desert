// The props of CatalogWorkspace, which maps a workspace onto the shell (DESIGN §3.2). `documentTitle` titles the document;
// `navigationSurface` is the navigation pane's identity (null: no pane) over the `navigation` destinations, `active` the
// one shown. `identity` heads the place; `title` names what the search searches, `query` and `searching` are its state
// and `searchContent` its results. `detail` and `backAvailable` offer Back (a destination page opened inside the place
// offers it too). `topActions` (grouped under one menu when `actionGroup` is "create") and `bottomToolbar` are the place's
// commands, raised through `invoke`; `content` is the place's body and `panelState` its panel and failure. Events: `query`,
// `navigate` to a destination, `search` opened, search `cancel`led, `back`. A caller that binds it drives the viewport
// through the shell's instance, forwarded.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { BottomToolbarSchema, ToolbarActionSchema } from "../../../../interaction/toolbar.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";
import type { PlaceIdentity } from "../../../infra/place-identity.ts";
import type { WorkspaceDestination } from "../../../infra/workspace-navigation.ts";
import type { WorkspaceContent, WorkspacePanels, WorkspaceSearch } from "../../../infra/workspace-content.ts";

export const CatalogWorkspaceContract = {
  props: Type.Object({
    documentTitle: text,
    navigationSurface: Type.Union([Type.Null(), Type.Object({
      title: text, subtitle: Type.Optional(text), settingsPlaceholder: Type.Optional(Type.Literal(true)),
    }, { additionalProperties: false })]),
    title: text,
    navigation: Type.Array(Type.Unsafe<WorkspaceDestination>()),
    active: Type.String(),
    query: Type.String(),
    searching: Type.Boolean(),
    identity: Type.Unsafe<PlaceIdentity>(),
    content: Type.Unsafe<WorkspaceContent>(),
    searchContent: Type.Optional(Type.Unsafe<WorkspaceSearch>()),
    detail: Type.Optional(Type.Boolean()),
    backAvailable: Type.Optional(Type.Boolean()),
    searchAvailable: Type.Optional(Type.Boolean()),
    topActions: Type.Optional(Type.Array(ToolbarActionSchema)),
    actionGroup: Type.Optional(Type.Literal("create")),
    invoke: Type.Optional(Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void())),
    panelState: Type.Optional(Type.Unsafe<WorkspacePanels>()),
    bottomToolbar: Type.Optional(BottomToolbarSchema),
  }, { additionalProperties: false }),
  events: Type.Object({
    query: Type.String(),
    navigate: Type.String(),
    search: Type.Void(),
    cancel: Type.Void(),
    back: Type.Void(),
  }, { additionalProperties: false }),
  instance: Type.Object({
    scrollToTop: Type.Function([], Type.Void()),
    scrollTop: Type.Function([], Type.Number()),
    focusTitle: Type.Function([], Type.Void()),
    focusContent: Type.Function([], Type.Void()),
    restoreRecord: Type.Function([Type.Number(), Type.String(), Type.String()], Type.Void()),
    revealItem: Type.Function([Type.String()], Type.Promise(Type.Boolean())),
    scrollPositions: Type.Function([], Type.Object({ content: Type.Number(), search: Type.Number() }, { additionalProperties: false })),
    restoreScroll: Type.Function([Type.Number(), Type.Number()], Type.Void()),
    focus: Type.Function([Type.String()], Type.Boolean()),
    toggleNavigation: Type.Function([], Type.Void()),
  }, { additionalProperties: false }),
} as const;
