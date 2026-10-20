import type { DependencyBinding } from "./bindings.ts";
import type { DistributionDefinition } from "./distributions.ts";
import { requireReference } from "./references.ts";

export function checkBindings(bindings: DependencyBinding[], required: Set<string>, surface: string,
  distributions: Map<string, DistributionDefinition>) {
  const seen = new Set<string>();
  for (const binding of bindings) {
    if (seen.has(binding.dependency)) throw new Error(`Duplicate binding: ${binding.dependency}`);
    seen.add(binding.dependency);
    if (!required.has(binding.dependency)) throw new Error(`Unused binding: ${binding.dependency}`);
    if (binding.kind === "local") continue;
    const service = requireReference(distributions, binding.service, "controller");
    if (service.kind !== "controller" || !service.serves.includes(surface)) {
      throw new Error("Controller does not serve surface");
    }
    if (!service.provides.includes(binding.dependency)) {
      throw new Error(`Controller does not provide dependency: ${binding.dependency}`);
    }
  }
  for (const dependency of required) {
    if (!seen.has(dependency)) throw new Error(`Missing binding: ${dependency}`);
  }
}
