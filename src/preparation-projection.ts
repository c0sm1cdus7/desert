import type { ProductDefinition } from "./contracts.ts";
import type { compileProgram } from "./compile-program.ts";
import type { JourneyDefinition, SurfaceDefinition } from "./program-grammar.ts";
import { commandInputTargets } from "./command-input-targets.ts";

export function preparationFields(product: ProductDefinition, program: ReturnType<typeof compileProgram>,
  surface: SurfaceDefinition, journey: Extract<JourneyDefinition, { kind: "mutation" }>) {
  const command = journey.command;
  const owner = product.policies?.find(policy => policy.object === command.object)?.field;
  const reads = surface.journeys.map(id => program.journeys.get(id)!)
    .filter(journey => journey.kind === "read" && journey.object === command.object);
  const details = reads.flatMap(journey => journey.kind === "read" ? journey.fields : []);
  const exposed = new Set([...commandInputTargets(command), ...details,
    ...reads.flatMap(journey => journey.kind === "read" ? journey.collection : [])]);
  const effects = Object.keys(command.kind === "create" ? command.values : command.set).filter(name => name !== owner);
  if (surface.kind === "human" && surface.commit[journey.id] === "review") {
    for (const name of effects) {
      if (!exposed.has(name)) throw new Error(`UNSUPPORTED_REVIEW_PROJECTION: ${journey.id}.${name}`);
    }
  }
  return [...new Set([...details, ...effects.filter(name => exposed.has(name))])].filter(name => name !== owner);
}
