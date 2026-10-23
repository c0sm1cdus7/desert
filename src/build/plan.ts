import type { compile } from "../compile.ts";
import { loadDefinition } from "../compiled-definition.ts";
import { DistributionSchema } from "../distributions.ts";
import { Type } from "@sinclair/typebox";
import { createSchemaValidator } from "../validation.ts";
import { jsonSnapshot } from "../json.ts";

export type Application = ReturnType<typeof compile>;
export type Plan = ReturnType<Application["planDistributions"]>[number];
export type ClientPlan = Extract<Plan, { kind: "client" }>;
const validate = createSchemaValidator<import("../distributions.ts").DistributionDefinition[]>(Type.Array(DistributionSchema));

export function resolveBuild(application: Application, definitions: unknown, target: string) {
  loadDefinition(application);
  const snapshot = jsonSnapshot(definitions);
  if (!validate(snapshot)) throw new Error("INVALID_DISTRIBUTIONS");
  const plans = application.planDistributions(snapshot);
  const plan = plans.find(item => item.id === target);
  if (!plan) throw new Error("UNKNOWN_DISTRIBUTION");
  return { plan, definitions: snapshot };
}

export function webConnection(plan: ClientPlan) {
  const dependencies = [...new Set(plan.interaction.journeys.flatMap(journey => journey.dependencies))];
  if (!dependencies.length || dependencies.length !== plan.bindings.length) throw new Error("UNSUPPORTED_WEB_DEPENDENCIES");
  const bindings = plan.bindings;
  if (bindings.some(binding => binding.kind !== "remote")) throw new Error("UNSUPPORTED_WEB_BINDING");
  const services = new Set(bindings.map(binding => binding.kind === "remote" ? binding.service : undefined));
  if (services.size !== 1) throw new Error("UNSUPPORTED_WEB_SERVICES");
  const service = [...services][0]!;
  return { kind: "local-http-session" as const, roles: dependencies.sort(), service };
}
