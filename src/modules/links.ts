import type { AuthoredView, AuthoredViewJourney, ReadJourneyTarget } from "./authored-types.ts";
import type { ModuleDefinition, ModuleEntryKind, ModuleJourney, ProductComposition } from "./types.ts";
import type { ModuleReference, ReferenceContract } from "./reference-types.ts";
import type { Message } from "../views/definition.ts";

type Elements<O, K extends PropertyKey> = K extends keyof O
  ? NonNullable<O[K]> extends readonly (infer E)[] ? E : never : never;
type Values<C> = C extends object ? C[keyof C] : never;
type Public<C, K extends PropertyKey> = K extends keyof C ? Values<C[K]> : never;
type Views<M> = Extract<Elements<M, "views">, AuthoredView>;
type LocalJourneys<M> = Elements<M, "journeys"> extends infer J
  ? J extends object ? ("execution" extends keyof J ? NonNullable<J["execution"]> : never)
    | ("presentation" extends keyof J ? NonNullable<J["presentation"]> : never) : never : never;
type Outputs<V> = V extends { readonly outputs: readonly (infer O extends string)[] } ? O : never;
type ViewTargets<M, C> = Views<M> | Public<C, "views">;
type JourneyTargets<M, C> = LocalJourneys<M> | Public<C, "journeys">;
type DestinationTargets<M, C> = Elements<M, "destinations"> | Public<C, "destinations">;
type ViewDefinition<V> = V extends ModuleReference<"view"> ? ReferenceContract<V> : V;
type Action = AuthoredViewJourney["outputs"][number]["action"];
type LinkedAction<M, C, A = Action> = A extends { readonly journey: unknown }
  ? Omit<A, "journey"> & { readonly journey: JourneyTargets<M, C> } : A;
type LinkedOutput<M, C, V = ViewTargets<M, C>> = V extends object
  ? { readonly view: V; readonly output: Outputs<ViewDefinition<V>>; readonly action: LinkedAction<M, C> } : never;
type LinkedJourney<M, C, J = AuthoredViewJourney> = J extends AuthoredViewJourney ? {
  readonly [K in keyof J]: K extends "view" | "detailView" ? ViewTargets<M, C>
    : K extends "source" ? Extract<JourneyTargets<M, C>, ReadJourneyTarget>
    : K extends "outputs" ? readonly LinkedOutput<M, C>[] : J[K];
} : never;
type EmittingContent<V, C> = C extends { readonly kind: "stack"; readonly items: readonly unknown[] }
  ? Omit<C, "items"> & { readonly items: readonly EmittingContent<V, C["items"][number]>[] }
  : C extends { readonly output: unknown } ? Omit<C, "output"> & { readonly output: Outputs<V> } : C;
type Toolbar<V, T> = T extends { readonly actions: readonly (infer A)[] }
  ? Omit<T, "actions"> & { readonly actions: readonly EmittingContent<V, A>[] } : T;
type Dock<M, C, D> = D extends { readonly view: unknown } ? Omit<D, "view"> & { readonly view: ViewTargets<M, C> } : D;
type LinkedView<M, C, V extends AuthoredView> = {
  readonly [K in keyof V]: K extends "topDock" | "bottomDock" ? Toolbar<V, V[K]>
    : K extends "leftDock" | "rightDock" ? Dock<M, C, V[K]>
    : K extends "content" ? readonly EmittingContent<V, V["content"][number]>[] : V[K];
};
type OwnerLinks<M, C = never> = {
  readonly views?: readonly (Views<M> extends infer V ? V extends AuthoredView ? LinkedView<M, C, V> : never : never)[];
  readonly journeys?: readonly (Omit<ModuleJourney, "presentation"> & { readonly presentation?: LinkedJourney<M, C> })[];
  readonly destinations?: readonly (Elements<M, "destinations"> extends infer D ? D extends object
    ? Omit<D, "entryJourney"> & { readonly entryJourney: JourneyTargets<M, C> } : never : never)[];
};
export type ModuleLinks<M extends ModuleDefinition> = OwnerLinks<M> & {
  readonly exports?: { readonly [K in ModuleEntryKind]?: Readonly<Record<string,
    K extends "journeys" ? LocalJourneys<M> : Elements<M, K>>> };
};
export type ProductLinks<P extends ProductComposition> = OwnerLinks<P, P["modules"]> & {
  readonly workspace: ViewTargets<P, P["modules"]>;
  readonly entry: DestinationTargets<P, P["modules"]>;
  readonly navigation: readonly { readonly destination: DestinationTargets<P, P["modules"]>;
    readonly group: Message; readonly purpose: "content" | "utility" }[];
};
