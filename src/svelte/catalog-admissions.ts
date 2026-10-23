import type { WebCatalogDefinition } from "./catalog-manifest-schema.ts";
import { WebCatalogManifest } from "./catalog-manifest.ts";
import { freezeDeep } from "../json.ts";

type Registrations = typeof WebCatalogManifest.owners;
type AdapterGroups = { [K in keyof Registrations]: Registrations[K] extends { readonly adapters: infer A } ? A : never }[keyof Registrations];
type EntryNames<A> = A extends unknown ? keyof A : never;
type Admission<A, K extends PropertyKey> = A extends Record<K, infer Value> ? Value : never;
type Admissions = { readonly [K in EntryNames<AdapterGroups>]: Admission<AdapterGroups, K> };

/** This projection has no second entry/prop list or runtime component imports. */
export const AdapterCatalog = freezeDeep(Object.fromEntries(Object.values(WebCatalogManifest.owners)
  .flatMap(owner => "adapters" in owner ? Object.entries(owner.adapters) : []))) as Admissions;

export function catalogClosureSources(mode: WebCatalogDefinition["owners"][string]["closure"]): ReadonlySet<string> {
  return new Set(Object.values(WebCatalogManifest.owners).filter(owner => owner.closure === mode).map(owner => owner.source));
}
