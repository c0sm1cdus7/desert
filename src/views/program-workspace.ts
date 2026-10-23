import type { ViewProgram } from "./program-schema.ts";

/** Resolve declared composition; never fabricate navigation from exposure metadata. */
export function resolveProgramWorkspace(program: ViewProgram) {
  const view = program.views.find(view => view.id === program.workspace);
  if (!view || view.rightDock || view.topDock || view.bottomDock || view.outputs ||
    view.content.length !== 1 || view.content[0]?.kind !== "destination") {
    throw new Error("INVALID_WORKSPACE_VIEW");
  }
  if (!view.leftDock) return { view, navigation: undefined };
  const navigation = program.views.find(candidate => candidate.id === view.leftDock?.view);
  const header = navigation?.content[0];
  if (!navigation || navigation.leftDock || navigation.rightDock || navigation.topDock || navigation.bottomDock ||
    navigation.outputs || navigation.content.length !== 2 || header?.kind !== "header" || header.media ||
    navigation.content[1]?.kind !== "navigation" ||
    (typeof header.title !== "string" && header.title.kind !== "product-title")) {
    throw new Error("INVALID_NAVIGATION_VIEW");
  }
  return { view, navigation: { view: navigation,
    title: typeof header.title === "string" ? header.title : program.label, subtitle: header.subtitle ?? "" } };
}

export function validateProgramWorkspace(program: ViewProgram): ReadonlySet<string> {
  const workspace = resolveProgramWorkspace(program);
  const owned = new Set([workspace.view.id, ...(workspace.navigation ? [workspace.navigation.view.id] : [])]);
  for (const journey of program.journeys) {
    if (journey.kind === "action" || journey.kind === "activity") continue;
    if (owned.has(journey.view) || (journey.kind === "read" && owned.has(journey.detailView))) {
      throw new Error("WORKSPACE_VIEW_AS_DESTINATION");
    }
  }
  for (const view of program.views) {
    if (owned.has(view.id)) continue;
    if (view.leftDock || view.rightDock) throw new Error("UNSUPPORTED_PROGRAM_SIDE_DOCK");
    if (view.content.some(item => item.kind === "destination" || item.kind === "navigation" ||
      (item.kind === "header" && typeof item.title !== "string" && item.title.kind === "product-title"))) {
      throw new Error("WORKSPACE_CONTENT_OUTSIDE_WORKSPACE");
    }
  }
  return owned;
}
