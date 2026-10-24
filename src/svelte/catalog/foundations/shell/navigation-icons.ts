// Shell part: the icon (a name of the catalog's `icon` foundation) that draws each navigation destination's icon.
import { actionIconNames } from "../../../infra/action-icons.ts";
import type { WorkspaceIcon } from "../../../infra/workspace-navigation.ts";

export const navigationIconNames = {
  ...actionIconNames, landmark: "landmark", backpack: "backpack", panels: "panels-top-left",
} as const satisfies Record<WorkspaceIcon, string>;
