import type { ProductDefinition } from "./contracts.ts";
import type { compileProgram } from "./compile-program.ts";
import type { JourneyDefinition, SurfaceDefinition } from "./program-grammar.ts";
import { emitObject } from "./schema.ts";
import { freezeDeep } from "./json.ts";
import { InteractionCatalog } from "./interaction/catalog.ts";

function reviewFields(product: ProductDefinition, program: ReturnType<typeof compileProgram>,
  surface: Extract<SurfaceDefinition, { kind: "human" }>, journey: Extract<JourneyDefinition, { kind: "mutation" }>) {
  const command = journey.command;
  const owner = product.policies?.find(policy => policy.object === command.object)?.field;
  const reads = surface.journeys.map(id => program.journeys.get(id)!)
    .filter(journey => journey.kind === "read" && journey.object === command.object);
  const details = reads.flatMap(journey => journey.kind === "read" ? journey.fields : []);
  const exposed = new Set([...command.input, ...details,
    ...reads.flatMap(journey => journey.kind === "read" ? journey.collection : [])]);
  const effects = Object.keys(command.kind === "create" ? command.values : command.set).filter(name => name !== owner);
  // Review never grants visibility: unsupported consequential private changes fail closed.
  if (surface.commit[journey.id] === "review") {
    for (const name of effects) {
      if (!exposed.has(name)) throw new Error(`UNSUPPORTED_REVIEW_PROJECTION: ${journey.id}.${name}`);
    }
  }
  return [...new Set([...details, ...effects.filter(name => exposed.has(name))])].filter(name => name !== owner);
}

export function projectSurface(product: ProductDefinition, program: ReturnType<typeof compileProgram>, surface: SurfaceDefinition, digest: string) {
  const journeys = surface.journeys.map(id => {
    const journey = program.journeys.get(id)!;
    const dependencies = program.journeyDependencies.get(id)!;
    if (journey.kind === "mutation") return {
      id, kind: "mutation" as const, commandId: journey.command.id, dependencies,
      object: journey.command.object, inputFields: journey.command.input,
      inputSchema: program.commands.get(journey.command.id)!.inputSchema,
      ...(surface.kind === "human" ? { reviewFields: reviewFields(product, program, surface, journey) } : {}),
      ...(journey.command.kind === "update" ? { subject: journey.command.object } : {}),
      confirmation: journey.confirmation, outcome: journey.outcome,
    };
    const object = product.objects.find(object => object.id === journey.object)!;
    const projection = (fields: string[]) => emitObject({
      id: object.id, facts: Object.fromEntries(fields.map(name => [name, object.facts[name]!])),
    });
    return { id, kind: "read" as const, subject: object.id, dependencies,
      fields: journey.fields, collection: journey.collection,
      detailSchema: projection(journey.fields), collectionSchema: projection(journey.collection) };
  });
  return freezeDeep({
    protocol: "desert.interaction/6" as const, id: surface.id, kind: surface.kind,
    productId: product.id, contractDigest: digest, execution: "not-installed" as const, journeys,
    ...(surface.kind === "human" ? {
      catalog: InteractionCatalog, inputs: surface.inputs ?? {},
      navigation: { entry: surface.entry, primaryAction: surface.primaryAction, subjectActions: surface.subjectActions },
      language: surface.language, connection: surface.connection, commit: surface.commit,
    } : {}),
  });
}
