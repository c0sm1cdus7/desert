import type { Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import type { WithoutSurfaceSemantics } from "../human-exposure.ts";
import type { ModuleDefinitionSchema, ModuleExportsSchema, ModuleJourneySchema, OwnedDefinitionsSchema } from "./schema.ts";
import type { AuthoredView, AuthoredViewDestination, AuthoredViewJourney, AuthoredViewNavigationEntry, DestinationTarget, ExposedJourney, ViewTarget } from "./authored-types.ts";
import type { ModuleReference, ModuleReferenceKind } from "./reference-types.ts";
import type { JourneyDefinition } from "../program-grammar.ts";

export type { AuthoredView, AuthoredViewDestination, AuthoredViewJourney, AuthoredViewNavigationEntry } from "./authored-types.ts";
export type { ModuleReference, ModuleReferenceKind } from "./reference-types.ts";
export type OwnedDefinitions = Frozen<Static<typeof OwnedDefinitionsSchema>>;
export type ResolvedModuleDefinition = Frozen<Static<typeof ModuleDefinitionSchema>>;
export type ModuleExports = Frozen<Static<typeof ModuleExportsSchema>>;
export type ModuleEntryKind = keyof ModuleExports;
type ResolvedJourney = Frozen<Static<typeof ModuleJourneySchema>>;
type AuthoredJourney<J> = J extends ResolvedJourney ? {
  readonly [K in keyof J]: K extends "presentation" ? AuthoredViewJourney | Extract<J[K], undefined> : J[K];
} : never;
export type ModuleJourney = AuthoredJourney<ResolvedJourney>;
type ResolvedObject = NonNullable<OwnedDefinitions["objects"]>[number];
type Presentation = NonNullable<ResolvedObject["presentation"]>;
export type PublishedObject = Omit<ResolvedObject, "presentation"> & { readonly presentation?: Omit<Presentation, "view" | "actions"> & {
  readonly view: AuthoredView; readonly actions: readonly { readonly journey: Frozen<JourneyDefinition>; readonly icon: Presentation["actions"][number]["icon"] }[];
} };
export type AuthoredOwnedDefinitions = Omit<OwnedDefinitions, "objects" | "journeys" | "views" | "destinations"> & {
  readonly objects?: readonly PublishedObject[]; readonly journeys?: readonly ModuleJourney[];
  readonly views?: readonly AuthoredView[]; readonly destinations?: readonly AuthoredViewDestination[];
};
type ExportTargets = {
  objects: PublishedObject; dependencies: NonNullable<OwnedDefinitions["dependencies"]>[number];
  journeys: Frozen<JourneyDefinition> | AuthoredViewJourney; views: AuthoredView; destinations: AuthoredViewDestination;
};
export type AuthoredExports = { readonly [K in ModuleEntryKind]?: Readonly<Record<string, ExportTargets[K]>> };
export type ModuleDefinition = AuthoredOwnedDefinitions & { readonly id: string; readonly exports?: AuthoredExports };
declare const registeredModule: unique symbol;
export type RegisteredModule<M extends ModuleDefinition = ModuleDefinition> = Readonly<{ id: M["id"]; [registeredModule]: M }>;
export type ModuleSource<M> = M extends RegisteredModule<infer D> ? D : never;
type Registration<M, Target> = M extends { readonly journeys: readonly (infer J)[] }
  ? J extends { readonly execution: infer E } ? Target extends E ? J : never
    : J extends { readonly presentation: infer P } ? Target extends P ? J : never : never
  : never;
type Identity<T> = T extends { readonly id: infer Id extends string } ? Id : never;
type PublicMap<M, K extends ModuleEntryKind> = M extends ModuleDefinition
  ? M extends { readonly exports: { readonly [P in K]: infer Exports } } ? {
    readonly [Alias in keyof Exports]: ModuleReference<K extends "dependencies" ? "dependency" : Extract<K, `${string}s`> extends `${infer Kind}s` ? Extract<Kind, ModuleReferenceKind> : never,
      M["id"], Identity<Exports[Alias]>, K extends "journeys" ? Registration<M, Exports[Alias]> : Exports[Alias]>;
  } : {} : never;
type Commands<M> = M extends ModuleDefinition
  ? M extends { readonly exports: { readonly journeys: infer Exports } } ? {
    readonly [Alias in keyof Exports as Exports[Alias] extends { readonly kind: "mutation" } ? Alias : never]:
      Exports[Alias] extends { readonly command: infer C } ? ModuleReference<"command", M["id"], Identity<C>, C> : never;
  } : {} : never;
type Merge<U> = [U] extends [never] ? {} : (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never;
declare const registeredIndex: unique symbol;
export type ModuleIndex<M extends readonly RegisteredModule[] = readonly RegisteredModule[]> = Readonly<{
  [registeredIndex]: M;
}> & { readonly [K in ModuleEntryKind]: Merge<PublicMap<ModuleSource<M[number]>, K>> } & {
  readonly commands: Merge<Commands<ModuleSource<M[number]>>>;
};
export type AnyModuleIndex = Readonly<{ [registeredIndex]: readonly RegisteredModule[] }>;
export type CatalogSource<C extends AnyModuleIndex> = ModuleSource<C[typeof registeredIndex][number]>;
export type AuthoredExposure = ({ readonly id: string; readonly kind: "human"; readonly locale: string; readonly journeys: readonly ExposedJourney[] } & WithoutSurfaceSemantics)
  | { readonly id: string; readonly kind: "agent"; readonly journeys: readonly ExposedJourney[] };
export type ProductComposition = AuthoredOwnedDefinitions & {
  readonly id: string; readonly label: string; readonly modules: AnyModuleIndex; readonly exposures: readonly AuthoredExposure[];
  readonly workspace: ViewTarget;
  readonly entry: DestinationTarget; readonly navigation: readonly AuthoredViewNavigationEntry[];
};
export type Closed<T, Shape> = T & Record<Exclude<keyof T, keyof Shape>, never>;
