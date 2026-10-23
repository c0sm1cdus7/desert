import { Components, defineView } from "desert-sdk/src/index.ts";
import { NavigationView } from "./navigation.view.ts";

export const WorkspaceView = defineView({ name: "workspace", leftDock: Components.Dock(NavigationView), content: [Components.Destination()] });
