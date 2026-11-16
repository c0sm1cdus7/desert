// Only references cross the action boundary. No dictionary of literal material survives capture.
import { AsyncLocalStorage } from "node:async_hooks";
import type { TSchema } from "@sinclair/typebox";
import { checkSecrets, secretPositions } from "./secret-positions.ts";
import { secretShape } from "../secret-shape.ts";
import { executionSchema, validMaterial, incomingMaterial } from "../../tools/inputs/secret-input.ts";
export const capturable = (value: unknown): value is string => typeof value === "string";
export type Scope = { refs: Set<string>; schema: TSchema | undefined; save: (value: string) => string };
export class ActionSecrets {
  readonly #save: (value: string) => string;
  readonly #active = new AsyncLocalStorage<Scope>();
  protected get active() {
    return this.#active;
  }
  constructor(save: (value: string) => string) {
    this.#save = save;
  }
  protected reference(value: unknown, scope: Scope): unknown {
    if (!capturable(value)) return "[secret]";
    if (scope.refs.has(value)) return value;
    const id = scope.save(value);
    scope.refs.add(id);
    return id;
  }
  protected input(schema: TSchema | undefined, value: unknown, scope: Scope): unknown {
    const shape = schema && executionSchema(schema);
    if (!secretShape(shape, value)) return "[secret]";
    return secretPositions(shape, value, value => this.reference(value, scope));
  }
  scope<T>(
    schema: TSchema | undefined,
    input: unknown,
    work: (input: unknown, valid: boolean) => T,
    save = this.#save,
    nested = false,
  ): T {
    checkSecrets(schema);
    const raw = incomingMaterial(input, schema);
    const inherited = (nested ? this.#active.getStore()?.refs : undefined) ?? new Set<string>();
    const scope: Scope = { refs: new Set(inherited), schema, save };
    // Nested actions can forward references minted by their parent; external text is always new material.
    const shape = secretShape(schema, raw) || secretShape(schema && executionSchema(schema), raw);
    const valid = shape && validMaterial(schema, raw, inherited);
    const kept = shape ? secretPositions(schema, raw, value => this.reference(value, scope)) : "[secret]";
    return this.#active.run(scope, () => work(kept, valid));
  }
  protected outside(): Scope {
    return { refs: new Set(), schema: undefined, save: this.#save };
  }
}
