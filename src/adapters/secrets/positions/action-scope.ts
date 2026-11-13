import { payloadText } from "../text/secret-output.ts";
// Each structural write stores new material; only its current async action supplies text cleaning.
import { AsyncLocalStorage } from "node:async_hooks";
import type { TSchema } from "@sinclair/typebox";
import { checkSecrets, secretPositions, storedSchema } from "./secret-positions.ts";
import { secretShape } from "../validation/secret-shape.ts";
export const capturable = (value: unknown): value is string => typeof value === "string";
export type Scope = { values: Map<string, string>; schema: TSchema | undefined; omitted: Set<unknown> };
export class ActionSecrets {
  private readonly save: (value: string) => string;
  protected readonly active = new AsyncLocalStorage<Scope>();
  constructor(save: (value: string) => string) {
    this.save = save;
  }
  protected reference(value: unknown, scope: Scope): unknown {
    if (!capturable(value)) {
      this.omit(value, scope);
      return "[secret]";
    }
    // A reference this scope just produced may cross the scrub/write boundary again.
    if (scope.values.get(value) === value) return value;
    const id = this.save(value);
    scope.values.set(value, id);
    scope.values.set(id, id);
    return id;
  }
  protected input(schema: TSchema | undefined, value: unknown, scope: Scope): unknown {
    if (!secretShape(schema, value)) {
      this.omit(value, scope);
      return "[secret]";
    }
    const kept = secretPositions(schema, value, value => this.reference(value, scope));
    return payloadText(schema && storedSchema(schema), kept, scope.values);
  }
  protected omit(value: unknown, scope: Scope, seen = new Set<object>()): void {
    scope.omitted.add(value);
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      scope.values.set(String(value), "[secret]");
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const item of Object.values(value)) this.omit(item, scope, seen);
  }
  scope<T>(schema: TSchema | undefined, input: unknown, work: () => T): T {
    checkSecrets(schema);
    const scope: Scope = { values: new Map(), schema, omitted: new Set() };
    if (!secretShape(schema, input)) this.omit(input, scope);
    else
      secretPositions(schema, input, value => {
        if (capturable(value)) scope.values.set(value, "[secret]");
        return value;
      });
    return this.active.run(scope, work);
  }
}
