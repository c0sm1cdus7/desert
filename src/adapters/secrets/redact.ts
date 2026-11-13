// Structural protection at declared positions. Public text is never searched or rewritten.
import { ActionSecrets, type Scope } from "./positions/action-scope.ts";
export { capturable } from "./positions/action-scope.ts";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Emission } from "../../journal/events.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { checkSecrets, secretPositions, record, storedSchema } from "./positions/secret-positions.ts";
import { executionSchema, replaced } from "../../tools/inputs/secret-input.ts";
export class Redactor<X extends Program> extends ActionSecrets {
  private readonly journal: TSchema;
  private schemaFor: ((value: Record<string, unknown>) => TSchema | undefined) | undefined;
  constructor(journal: TSchema, save: (value: string) => string) {
    super(save);
    checkSecrets(journal);
    this.journal = journal;
  }
  actions(resolve: (value: Record<string, unknown>) => TSchema | undefined): void {
    this.schemaFor = resolve;
  }
  capture(): void {}
  private emission(value: Record<string, unknown>, scope: Scope): unknown {
    if (value.layer === "house" && value.kind === "act" && record(value.data)) {
      const schema = this.schemaFor ? this.schemaFor(value) : scope.schema;
      return { ...value, data: { ...value.data, input: this.input(schema, value.data.input, scope) } };
    }
    const original = { ...value, id: "check", seq: 1, at: 0 };
    const schema = Value.Check(this.journal, original) ? this.journal : executionSchema(this.journal);
    const safe = secretPositions(schema, original, value => this.reference(value, scope));
    return { ...value, data: record(safe) ? safe.data : "[secret]" };
  }
  scrub = <T>(value: T): T => {
    const scope = this.active.getStore() ?? this.outside();
    if (record(value) && "layer" in value && "data" in value) return replaced(value, this.emission(value, scope));
    if (record(value) && Array.isArray(value.effects)) return { ...value, effects: value.effects.map(this.scrub) };
    return value;
  };
  write<E extends Emission<X["fact"]>>(emission: E): E {
    const schema = this.active.getStore() ? storedSchema(this.journal) : this.journal;
    if (!Value.Check(schema, { ...emission, id: "check", seq: 1, at: 0 })) throw new Error("Invalid original event");
    return this.scrub(emission);
  }
}
