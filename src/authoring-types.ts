import type { FieldDefinition, ObjectDefinition } from "./contracts.ts";

export type FieldValue<F extends FieldDefinition> = F extends { kind: "integer" } ? number
  : F extends { kind: "enum", values: (infer V)[] } ? V : string;
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
    : { kind: "literal", value: FieldValue<F> } | CompatibleInput<O, Keys, F>;
export type CreateValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in FieldKey<O>]: Assignment<O, Keys, O["facts"][K]>;
};
export type ChangeValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in WritableKey<O>]?: Assignment<O, Keys, O["facts"][K]>;
};
export type Conditions<O extends ObjectDefinition> = Partial<FactsOf<O>>;
export type InputOf<O extends ObjectDefinition, C extends { object: O["id"], input: WritableKey<O>[] }> =
  Pick<FactsOf<O>, C["input"][number]>;
