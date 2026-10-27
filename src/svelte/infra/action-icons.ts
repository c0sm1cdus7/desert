import type { ActionIcon } from "../../interaction/toolbar.ts";
import type { FaceIcon } from "../../interaction/face.ts";

/** The icon (a name of the catalog's `icon` foundation) that draws each action icon. */
export const actionIconNames = {
  back: "arrow-left", close: "x", save: "save", review: "eye", recover: "search", retry: "rotate-cw",
  create: "plus", archive: "archive", catalog: "layout-grid", open: "arrow-right", confirm: "check", search: "search", more: "ellipsis", navigation: "panel-left",
  media: "images", edit: "pencil", settings: "settings", lock: "lock", restore: "undo-2", palette: "palette",
  play: "play", pause: "pause", volume: "volume-2", muted: "volume-x", previous: "chevron-left", next: "chevron-right",
  "zoom-in": "plus", "zoom-out": "minus",
} as const satisfies Record<ActionIcon, string>;

/** The icon that draws each face icon: every action icon and the navigation destinations' glyphs. */
export const faceIconNames = {
  ...actionIconNames, landmark: "landmark", backpack: "backpack", panels: "panels-top-left",
} as const satisfies Record<FaceIcon, string>;
