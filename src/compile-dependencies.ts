import type { ProductDefinition } from "./contracts.ts";
import type { JourneyDefinition } from "./program-grammar.ts";
import { requireReference, uniqueById } from "./references.ts";

export function compileDependencies(product: ProductDefinition) {
  const dependencies = uniqueById(product.dependencies ?? [], "dependency");
  const objects = new Set(product.objects.map(object => object.id));
  const owners = new Map<string, string>();
  const closure = new Map<string, string[]>();
  const visiting = new Set<string>();

  function resolve(id: string): string[] {
    const known = closure.get(id);
    if (known) return known;
    const dependency = requireReference(dependencies, id, "dependency");
    if (visiting.has(id)) throw new Error(`Dependency cycle: ${id}`);
    visiting.add(id);
    const result = [...new Set([id, ...dependency.requires.flatMap(resolve)])].sort();
    visiting.delete(id);
    closure.set(id, result);
    return result;
  }
  for (const dependency of dependencies.values()) {
    if (dependency.kind === "controller") for (const object of dependency.objects) {
      if (!objects.has(object)) throw new Error(`Unknown controller object: ${object}`);
      if (owners.has(object)) throw new Error(`Competing controllers: ${object}`);
      owners.set(object, dependency.id);
    }
    resolve(dependency.id);
  }

  function forJourney(journey: JourneyDefinition) {
    const controller = requireReference(dependencies, journey.requires.controller, "dependency");
    const object = journey.kind === "read" ? journey.object : journey.command.object;
    if (controller.kind !== "controller" || !controller.objects.includes(object)) throw new Error(`Controller does not own: ${object}`);
    return [...new Set([journey.requires.controller, ...journey.requires.dependencies].flatMap(resolve))].sort();
  }

  return { definitions: dependencies, forJourney };
}
