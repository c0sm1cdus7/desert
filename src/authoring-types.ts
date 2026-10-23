import type { FieldDefinition, ObjectDefinition } from "./contracts.ts";
import type { AssetReference } from "./assets/types.ts";

export type FieldValue<F extends FieldDefinition> = F extends { kind: "integer" } ? number
  : F extends { kind: "labels" } ? readonly string[]
  : F extends { kind: "asset" } ? AssetReference : F extends { kind: "enum", values: (infer V)[] } ? V : string;
export type FactsOf<O extends ObjectDefinition> = { [K in keyof O["facts"]]: FieldValue<O["facts"][K]> };
export type FieldKey<O extends ObjectDefinition> = keyof O["facts"] & string;
export type WritableKey<O extends ObjectDefinition> = {
  [K in FieldKey<O>]: O["facts"][K] extends { kind: "principal" } ? never : K;
}[FieldKey<O>];
type CompatibleInput<O extends ObjectDefinition, Keys extends FieldKey<O>, F extends FieldDefinition> = {
  [K in Keys]: O["facts"][K]["kind"] extends F["kind"]
    ? FieldValue<O["facts"][K]> extends FieldValue<F> ? { kind: "input", field: K } : never : never;
}[Keys];
type Assignment<O extends ObjectDefinition, Keys extends FieldKey<O>, F extends FieldDefinition> =
  F extends { kind: "principal" } ? { kind: "actor" }
    : F extends { kind: "asset" } ? CompatibleInput<O, Keys, F>
    : F extends { kind: "labels" } ? { kind: "literal", value: [] } | CompatibleInput<O, Keys, F>
    : { kind: "literal", value: FieldValue<F> } | CompatibleInput<O, Keys, F>;
export type CreateValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in FieldKey<O>]: Assignment<O, Keys, O["facts"][K]>;
};
export type ChangeValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in WritableKey<O>]?: Assignment<O, Keys, O["facts"][K]>;
};
export type ScalarKey<O extends ObjectDefinition> = {
  [K in FieldKey<O>]: O["facts"][K] extends { kind: "asset" | "labels" } ? never : K;
}[FieldKey<O>];
export type Conditions<O extends ObjectDefinition> = Partial<Pick<FactsOf<O>, ScalarKey<O>>>;
export type InputOf<O extends ObjectDefinition, C extends { object: O["id"], input: WritableKey<O>[] }> =
  Pick<FactsOf<O>, C["input"][number]>;
