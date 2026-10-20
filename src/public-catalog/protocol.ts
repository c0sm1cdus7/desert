import { freezeDeep } from "../json.ts";
import { PublicCatalogDefinitionSchema, PublicCatalogSurfaceSchema, PublicCatalogStateSchema } from "./schema.ts";
import { CatalogCardSchema, CatalogHomeSchema, CatalogDetailSchema } from "./node-schema.ts";
import { CatalogEventSchema } from "./events.ts";
import { RendererRequirementsSchema } from "./capabilities.ts";
import { PublicCatalogExercisesSchema } from "./exercises.ts";

/** TypeScript and portable JSON Schema originate from the same grammar, not a second native definition. */
export function publicCatalogSchemas() {
  const schemas = { definition: PublicCatalogDefinitionSchema, surface: PublicCatalogSurfaceSchema,
    state: PublicCatalogStateSchema, card: CatalogCardSchema, home: CatalogHomeSchema,
    detail: CatalogDetailSchema, event: CatalogEventSchema, requirements: RendererRequirementsSchema, exercises: PublicCatalogExercisesSchema };
  // TypeBox symbol metadata is intentionally not part of the wire artifact.
  return freezeDeep(JSON.parse(JSON.stringify(schemas)) as Record<keyof typeof schemas, Record<string, unknown>>);
}
