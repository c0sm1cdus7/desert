import { Type } from "@sinclair/typebox";
import { DistributionSchema, type DistributionDefinition } from "./distributions.ts";
import { freezeDeep, jsonSnapshot } from "./json.ts";
import type { projectSurface } from "./project-surface.ts";
import { requireReference, uniqueById } from "./references.ts";
import { createSchemaValidator } from "./validation.ts";
import { checkBindings } from "./check-bindings.ts";
import type { DependencyDefinition } from "./dependencies.ts";

const validate = createSchemaValidator<DistributionDefinition[]>(Type.Array(DistributionSchema, { minItems: 1 }));
const targets = { "svelte-web": "web", "swiftui-ios": "ios", "terminal-cli": "terminal" } as const;

export function planDistributions(productId: string, contractDigest: string,
  surfaces: Map<string, ReturnType<typeof projectSurface>>, dependencies: Map<string, DependencyDefinition>, definitions: unknown) {
  const snapshot = jsonSnapshot(definitions);
  if (!validate(snapshot)) throw new Error("Invalid distribution definition");
  const distributions = uniqueById(snapshot, "distribution");
  for (const definition of distributions.values()) {
    if (definition.product !== productId) throw new Error(`Foreign product: ${definition.product}`);
    if (definition.kind === "controller") {
      for (const id of definition.serves) requireReference(surfaces, id, "surface");
      for (const id of definition.provides) requireReference(dependencies, id, "dependency");
    }
  }
  return freezeDeep(snapshot.map(definition => {
    const common = { contractDigest, status: "unbuilt" as const };
    if (definition.kind === "controller") return { ...definition, ...common, kind: "controller" as const,
      requirements: ["admitted-journey-executor", "trusted-identity", "postgresql-store", "protocol-server"] };
    const interaction = requireReference(surfaces, definition.surface, "surface");
    if (interaction.kind !== "human") throw new Error("Human renderer requires human surface");
    const required = new Set(interaction.journeys.flatMap(journey => journey.dependencies));
    checkBindings(definition.bindings, required, definition.surface, distributions);
    return { ...definition, ...common, kind: "client" as const, target: targets[definition.renderer], interaction,
      requirements: [definition.renderer, ...definition.bindings.map(binding => binding.kind === "local"
        ? `local-adapter:${binding.adapter}` : `authenticated-protocol-client:${binding.service}`)] };
  }));
}
