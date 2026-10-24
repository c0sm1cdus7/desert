// The props of PublicCatalogProductContent: the published catalog surface, as the domain's PublicCatalogSurfaceSchema
// defines it; navigation, search and browser history are its own state.
import { Type } from "@sinclair/typebox";
import { PublicCatalogSurfaceSchema } from "../../../../public-catalog/schema.ts";

export const PublicCatalogProductContentContract = {
  props: Type.Object({ surface: PublicCatalogSurfaceSchema }, { additionalProperties: false }),
} as const;
