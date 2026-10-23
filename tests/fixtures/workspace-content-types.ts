import type { WorkspaceContent, WorkspaceContentActions, WorkspaceViewportActions, WorkspaceSearch } from "../../src/svelte/infra/workspace-content.ts";
const view = { kind: "view-program", visited: [], activeView: "notes", albums: {},
  onevent() {}, onalbum() {}, onactions() {} } as const satisfies WorkspaceContent;
const search = { kind: "view", title: "Notes", description: "Find a note.", results: [], onselect() {} } as const satisfies WorkspaceSearch;
const viewport = { scrollToTop() {}, scrollTop: () => 0, focusTitle() {}, restoreRecord() {}, revealItem() {} } satisfies WorkspaceViewportActions;
const actions = { revealEntry: async () => {}, selectMedia: () => false } satisfies WorkspaceContentActions;
void [view, search, viewport, actions];

// @ts-expect-error Only installed finite body kinds are admitted.
const arbitraryBody = { kind: "custom", component: () => "foreign" } satisfies WorkspaceContent;
// @ts-expect-error A content descriptor cannot carry a renderer.
const renderInjection = { ...view, render: () => "foreign" } satisfies WorkspaceContent;
// @ts-expect-error A content descriptor cannot carry child markup.
const childInjection = { ...view, children: () => "foreign" } satisfies WorkspaceContent;
// @ts-expect-error Search results and selection must share the same declared source kind.
const badSearch = { ...search, kind: "unknown" } satisfies WorkspaceSearch;
// @ts-expect-error Entry lookup is semantic and does not return a DOM target.
const domLookup = { ...actions, revealEntry: async () => document.body } satisfies WorkspaceContentActions;
// @ts-expect-error Viewport registration cannot provide native DOM authority.
const nativeViewport = { ...viewport, element: document.body } satisfies WorkspaceViewportActions;
// @ts-expect-error Access is a dedicated finite experience, not workspace body content.
const wrongBody = { kind: "access", current: view } satisfies WorkspaceContent;
void [arbitraryBody, renderInjection, childInjection, badSearch, domLookup, nativeViewport, wrongBody];
