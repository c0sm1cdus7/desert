import { Components, ViewTitles, defineView } from "../../src/index.ts";

export const NavigationView = defineView({
  name: "workspace-navigation", content: [
    Components.Header({ title: ViewTitles.product }),
    Components.Navigation(),
  ],
});

export const WorkspaceView = defineView({
  name: "workspace", leftDock: Components.Dock(NavigationView), content: [Components.Destination()],
});

export const workspaceViews = [
  NavigationView,
  { ...WorkspaceView, leftDock: { ...WorkspaceView.leftDock, view: NavigationView.id } },
] as const;
