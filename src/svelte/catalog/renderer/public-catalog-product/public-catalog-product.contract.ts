// The props of PublicCatalogProduct: the public catalog `surface` the built page mounts.
import { Type } from "@sinclair/typebox";
import type { PublicCatalogSurface } from "../../../../public-catalog/client.ts";

export const PublicCatalogProductContract = {
  props: Type.Object({
    surface: Type.Unsafe<PublicCatalogSurface>(),
  }, { additionalProperties: false }),
} as const;
