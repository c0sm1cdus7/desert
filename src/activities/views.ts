import type { View } from "../views/schema.ts";
import { viewInputs } from "../views/ports.ts";
import type { ActivityPlan } from "./schema.ts";

export function requireActivityViews(views: readonly View[]) {
  for (const view of views) if (view.leftDock || view.rightDock || view.topDock || view.bottomDock || view.outputs?.length
    || view.content.some(item => ["destination", "navigation", "visual-catalog", "media-library", "appearance", "system-status", "identity"].includes(item.kind))) {
    throw new Error("UNSUPPORTED_ACTIVITY_VIEW");
  }
}

export function requireActivityBindings(views: readonly View[], plan: ActivityPlan) {
  const requirePort = (id: string, kind: "form" | "context") => {
    const view = views.find(item => item.id === id);
    if (!view) throw new Error("ACTIVITY_VIEW_NOT_INSTALLED");
    const ports = viewInputs(view);
    if (ports.length !== 1 || ports[0]!.kind !== kind) throw new Error("INVALID_ACTIVITY_VIEW_BINDING");
  };
  plan.steps.forEach(step => requirePort(step.view, "form"));
  requirePort(plan.review, "context");
}
