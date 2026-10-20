import { svelteWebBuilder } from "./svelte/builder.ts";
import type { ClientPlan, Plan } from "./plan.ts";

export function installedBuilder(plan: Plan): { plan: ClientPlan, builder: typeof svelteWebBuilder } {
  if (plan.kind !== "client") throw new Error("BUILDER_NOT_INSTALLED: controller");
  if (plan.renderer !== svelteWebBuilder.id) throw new Error("BUILDER_NOT_INSTALLED: " + plan.renderer);
  return { plan, builder: svelteWebBuilder };
}
