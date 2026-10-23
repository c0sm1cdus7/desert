import type { ProductDefinition } from "./contracts.ts";
import type { compileProgram } from "./compile-program.ts";
import type { SurfaceDefinition } from "./program-grammar.ts";
import { emitObject } from "./schema.ts";
import { freezeDeep } from "./json.ts";
import { InteractionCatalog } from "./interaction/catalog.ts";
import { InteractionProtocolVersion } from "./interaction/protocol.ts";
import { preparationFields } from "./preparation-projection.ts";
import { surfaceFieldKinds, surfaceFields } from "./surface-fields.ts";
import { referenceCapabilities } from './reference-capabilities.ts';
import { mediaReferenceCapabilities } from './media-reference-capabilities.ts';

export function projectSurface(product: ProductDefinition, program: ReturnType<typeof compileProgram>, surface: SurfaceDefinition, digest: string) {
  const exposed = surface.journeys.map(id => program.journeys.get(id)!);
  const journeys = surface.journeys.map(id => {
    const journey = program.journeys.get(id)!;
    const dependencies = program.journeyDependencies.get(id)!;
    if (journey.kind === "mutation") {
      const responseFields = preparationFields(product, program, surface, journey);
      return {
        id, kind: "mutation" as const, commandId: journey.command.id, dependencies,
        object: journey.command.object, inputFields: journey.command.input,
        inputSchema: program.commands.get(journey.command.id)!.inputSchema,
        responseFields,
        ...(surface.kind === "human" ? { reviewFields: responseFields } : {}),
        ...(journey.command.kind === "update" ? { subject: journey.command.object } : {}),
        confirmation: journey.confirmation, outcome: journey.outcome,
      };
    }
    const object = product.objects.find(object => object.id === journey.object)!;
    const projection = (fields: string[]) => emitObject({
      id: object.id, facts: Object.fromEntries(fields.map(name => [name, object.facts[name]!])),
    });
    return { id, kind: "read" as const, subject: object.id, dependencies,
      fields: journey.fields, collection: journey.collection,
      detailSchema: projection(journey.fields), collectionSchema: projection(journey.collection) };
  });
  return freezeDeep({
    protocol: InteractionProtocolVersion, id: surface.id, kind: surface.kind,
    productId: product.id, contractDigest: digest, execution: "not-installed" as const, journeys,
    ...(surface.kind === "human" ? {
      catalog: InteractionCatalog, fieldRepresentations: surface.fieldRepresentations,
      fieldReferences: referenceCapabilities(product, exposed),
      fieldMediaReferences:mediaReferenceCapabilities(product,exposed),
      fieldKinds: surfaceFieldKinds(surfaceFields(exposed).presented, new Map(product.objects.map(object => [object.id, object]))),
      language: surface.language, connection: surface.connection, commit: surface.commit,
    } : {}),
  });
}
