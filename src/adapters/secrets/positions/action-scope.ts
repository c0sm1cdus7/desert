// A value is stored once, but only the current async action supplies the text-cleaning dictionary.
import { AsyncLocalStorage } from "node:async_hooks";
import type { TSchema } from "@sinclair/typebox";
import { checkSecrets, secretPositions } from "./secret-positions.ts";
export const capturable = (value: unknown): value is string => typeof value === "string";
export type Scope = { values: Map<string, string>; schema: TSchema | undefined; omitted: Set<unknown> };
export class ActionSecrets {
  private readonly values: Map<string, string>;
  private readonly save: (value: string) => string;
  protected readonly active = new AsyncLocalStorage<Scope>();
  constructor(values: Map<string, string>, save: (value: string) => string) {
    this.values = values;
    this.save = save;
  }
  protected reference(value: unknown, scope: Scope): unknown {
    if (!capturable(value)) {
      scope.omitted.add(value);
      this.captureMalformed(value, scope);
      return "[secret]";
    }
    const id = this.values.get(value) ?? this.save(value);
    this.values.set(value, id);
    scope.values.set(value, id);
    return id;
  }
  private captureMalformed(value: unknown, scope: Scope, seen = new Set<object>()): void {
    if (typeof value === "string") {
      this.reference(value, scope);
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") scope.values.set(String(value), "[secret]");
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const item of Object.values(value)) this.captureMalformed(item, scope, seen);
  }
  scope<T>(schema: TSchema | undefined, input: unknown, work: () => T): T {
    checkSecrets(schema);
    const scope: Scope = { values: new Map(), schema, omitted: new Set() };
    secretPositions(schema, input, value => this.reference(value, scope));
    return this.active.run(scope, work);
  }
}
