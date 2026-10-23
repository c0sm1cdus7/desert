import { Check } from "@sinclair/typebox/value";
import type { Static } from "@sinclair/typebox";
import { ProductDefinitionSchema, type ObjectDefinition } from "../contracts.ts";
import type { FieldKey } from "../authoring-types.ts";
import { CommandSchema, type CommandDefinition } from "../program-grammar.ts";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { FactReferenceSchema } from "./object-presentation.ts";
import type { AuthoredView, ViewTarget } from "../modules/authored-types.ts";
import type { ModuleReference, ReferenceContract } from "../modules/reference-types.ts";
import { authoredView, viewTargetDefinition } from "./authored-view.ts";
import { publicReference } from '../modules/references.ts';

type FactReferenceShape = Static<typeof FactReferenceSchema>;
export type FactReference<Id extends FactReferenceShape["object"] = FactReferenceShape["object"],
  Field extends FactReferenceShape["field"] = FactReferenceShape["field"]> =
  Frozen<FactReferenceShape & { object: Id; field: Field }>;
type Output<V> = V extends ModuleReference<"view"> ? Output<ReferenceContract<V>>
  : V extends { readonly outputs: readonly (infer O extends string)[] } ? O : never;

export function factReference<const O extends ObjectDefinition, const F extends FieldKey<NoInfer<O>>>(object: O, field: F):Readonly<{object:O['id'];field:F}>;
export function factReference<const O extends ModuleReference<'object',string,string,Frozen<ObjectDefinition>>,
  const F extends Extract<keyof ReferenceContract<NoInfer<O>>['facts'],string>>(object:O,field:F):Readonly<{object:O['id'];field:F}>;
export function factReference(object: ObjectDefinition | ModuleReference<'object'>, field: string) {
  const referenced=publicReference(object,'object');
  let definition:unknown=object;
  if(referenced){
    // A genuine public object can carry its presentation; facts retain the same
    // domain contract and do not require a consumer to import private definitions.
    const {presentation,...contract}=referenced.value as ObjectDefinition&{presentation?:unknown};
    definition=contract;
  }
  const snapshot = jsonSnapshot(definition);
  if (!Check(ProductDefinitionSchema.properties.objects.items, snapshot) || !Object.hasOwn(snapshot.facts, field)) {
    throw new Error("UNKNOWN_FACT_REFERENCE");
  }
  return Object.freeze({ object: snapshot.id, field });
}

/** References the declared output; the journey still supplies its meaning. */
export function viewOutput<const V extends ViewTarget, const O extends Output<NoInfer<V>>>(definition: V, output: O) {
  const snapshot = viewTargetDefinition(definition);
  if (!Array.isArray(snapshot.outputs) || !snapshot.outputs.includes(output)) throw new Error("UNKNOWN_VIEW_OUTPUT_REFERENCE");
  return Object.freeze({ view: definition, output });
}

/** The program additionally checks the authorized source read and compatible fact types. */
export function initializeInput<const C extends CommandDefinition, const I extends NoInfer<C>["input"][number],
  const F extends FactReference<NoInfer<C>["object"]>>(command: C, input: I, fact: F) {
  const snapshot = { command: jsonSnapshot(command), fact: jsonSnapshot(fact) };
  if (!Check(CommandSchema, snapshot.command) || !snapshot.command.input.includes(input)) {
    throw new Error("UNKNOWN_COMMAND_INPUT_REFERENCE");
  }
  if (!Check(FactReferenceSchema, snapshot.fact) || snapshot.fact.object !== snapshot.command.object) {
    throw new Error("FOREIGN_INITIALIZER_FACT");
  }
  return freezeDeep({ input, fact: snapshot.fact.field as F["field"] });
}

/** Starts a creation at the host file picker; admission checks the input's installed file capability. */
export function chooseFile<const C extends CommandDefinition, const I extends NoInfer<C>["input"][number]>(command: C, input: I) {
  const snapshot = jsonSnapshot(command);
  if (!Check(CommandSchema, snapshot) || !snapshot.input.includes(input)) throw new Error("UNKNOWN_COMMAND_INPUT_REFERENCE");
  return Object.freeze({ kind: "file-picker" as const, input });
}
