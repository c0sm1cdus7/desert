import type { ActionIcon } from "../../interaction/toolbar.ts";

/** The icon (a name of the catalog's `icon` foundation) that draws each action icon. */
export const actionIconNames = {
  back: "arrow-left", close: "x", save: "save", review: "eye", recover: "search", retry: "rotate-cw",
  create: "plus", archive: "archive", catalog: "layout-grid", open: "arrow-right", confirm: "check", search: "search", more: "ellipsis", navigation: "panel-left",
  media: "images", edit: "pencil", settings: "settings", lock: "lock", restore: "undo-2", palette: "palette",
} as const satisfies Record<ActionIcon, string>;
