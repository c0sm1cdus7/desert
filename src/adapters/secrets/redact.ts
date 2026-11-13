// Action-local text cleaning and schema-position references share storage, never a global text dictionary.
import { ActionSecrets, type Scope } from "./positions/action-scope.ts";
export { capturable } from "./positions/action-scope.ts";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Emission } from "../../journal/events.ts";
import type { Program, ToolRegistry } from "../../tools/tool-contract.ts";
import { actionText, replaced } from "./text/action-text.ts";
import { houseText, payloadText } from "./text/secret-output.ts";
import { checkSecrets, secretPositions, record, storedSchema } from "./positions/secret-positions.ts";
export class Redactor<X extends Program> extends ActionSecrets {
  private readonly journal: TSchema;
  private schemaFor: ((value: Record<string, unknown>) => TSchema | undefined) | undefined;
  constructor(journal: TSchema, values: Map<string, string>, save: (value: string) => string) {
    super(values, save);
    checkSecrets(journal);
    this.journal = journal;
  }
  actions(resolve: (value: Record<string, unknown>) => TSchema | undefined): void {
    this.schemaFor = resolve;
  }
  /** Preparing a presentation does not add the whole vault to its text scope. */
  capture(value: unknown, registry: ToolRegistry<X>): void {
    const scope = this.active.getStore();
    if (!scope || !record(value)) return;
    const schema = registry.find(tool => tool.id === value.target)?.acts[String(value.act)]?.input ?? scope.schema;
    secretPositions(schema, value.input, value => this.reference(value, scope));
  }
  private input(schema: TSchema | undefined, value: unknown, scope: Scope): unknown {
    const kept = secretPositions(schema, value, value => this.reference(value, scope));
    return payloadText(schema && storedSchema(schema), kept, scope.values);
  }
  private emission(value: Record<string, unknown>, scope: Scope): unknown {
    if (value.layer === "house" && value.kind === "act" && record(value.data)) {
      const schema = this.schemaFor ? this.schemaFor(value) : scope.schema;
      const input = this.input(schema, value.data.input, scope);
      return { ...value, data: { ...value.data, input } };
    }
    const original = { ...value, id: "check", seq: 1, at: 0 };
    const safe = secretPositions(this.journal, original, value => this.reference(value, scope));
    if (!record(safe)) return { ...value, data: "[secret]" };
    const cleaned = payloadText(storedSchema(this.journal), safe, scope.values);
    const data = record(cleaned) ? cleaned.data : safe.data;
    if (value.layer === "house")
      return { ...value, data: houseText(value.kind, safe.data, scope.values, scope.omitted) };
    return { ...value, data };
  }
  scrub = <T>(value: T): T => {
    const scope = this.active.getStore() ?? {
      values: new Map<string, string>(),
      schema: undefined,
      omitted: new Set(),
    };
    if (record(value) && "layer" in value && "data" in value) return replaced(value, this.emission(value, scope));
    if (record(value) && Array.isArray(value.effects)) {
      const { effects, status, draft, ...rest } = value;
      const keptDraft = draft === undefined ? {} : { draft: this.input(scope.schema, draft, scope) };
      return replaced(value, {
        ...actionText(rest, scope.values, scope.omitted),
        ...keptDraft,
        status,
        effects: effects.map(this.scrub),
      });
    }
    return actionText(value, scope.values, scope.omitted);
  };
  write<E extends Emission<X["fact"]>>(emission: E): E {
    if (!Value.Check(this.journal, { ...emission, id: "check", seq: 1, at: 0 }))
      throw new Error("Invalid original event");
    return this.scrub(emission);
  }
}
