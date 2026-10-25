// The props of Shell, the workspace (DESIGN §3.2). `documentTitle` titles the document; `label` and `destination` name
// the main place; `searching` and `hasQuery` drive the search overlay whose region is `resultsId` (the id its top bar's
// search controls); `detail` and `backAvailable` enable going back by the edge swipe. `navigation` is the navigation pane
// as data, or null when the workspace has none. Events: `navigate` to a destination, `back`, `cancelsearch` (true when
// focus returns to its opener) and `composition`. A caller that binds it drives its viewport through the instance:
// scroll positions, the place title, the main place itself (`focusContent`), items by id and keys of its focus scope.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { ShellNavigationSchema } from "../../../infra/workspace-navigation.ts";

export const ShellContract = {
  props: Type.Object({
    documentTitle: text,
    label: text,
    destination: Type.String(),
    searching: Type.Boolean(),
    hasQuery: Type.Boolean(),
    detail: Type.Boolean(),
    backAvailable: Type.Boolean(),
    resultsId: Type.String(),
    navigation: Type.Union([Type.Null(), ShellNavigationSchema]),
  }, { additionalProperties: false }),
  events: Type.Object({
    navigate: Type.String(),
    back: Type.Void(),
    cancelsearch: Type.Boolean(),
    composition: Type.Boolean(),
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
  marks: ["data-catalog-workspace", "data-search-active", "data-catalog-search-scroll", "data-has-query", "data-catalog-search-material",
    "data-navigation-return", "data-adaptive-host", "data-adaptive-host-content", "data-catalog-edge-navigation", "data-navigation-icon"],
} as const;
