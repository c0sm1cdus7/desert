import type { SurfaceDefinition } from "../program-grammar.ts";
import type { CatalogSource, ProductComposition } from "./types.ts";

type Elements<O, K extends PropertyKey> = O extends unknown
  ? K extends keyof O ? NonNullable<O[K]> extends readonly (infer E)[] ? E : never : never : never;
type CompiledSurface<S> = S extends { readonly id: infer Id; readonly kind: "human" }
  ? Omit<Extract<SurfaceDefinition, { kind: "human" }>, "id"> & { id: Id }
  : S extends { readonly id: infer Id; readonly kind: "agent" }
    ? Omit<Extract<SurfaceDefinition, { kind: "agent" }>, "id"> & { id: Id } : never;
type Dependencies<P extends ProductComposition> = Elements<P, "dependencies">
  | Elements<CatalogSource<P["modules"]>, "dependencies">;

export type ComposedDefinition<P extends ProductComposition, Domain> =
  Omit<Domain, "id" | "surfaces" | "dependencies"> & {
    id: P["id"];
    surfaces: CompiledSurface<P["surfaces"][number]>[];
    dependencies?: Dependencies<P>[];
  };
