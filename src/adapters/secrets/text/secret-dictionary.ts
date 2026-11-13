/** Action-local values are deliberately enumerable only through the cleaning API, never object inspection. */
export class SecretDictionary {
  readonly #values = new Map<string, string>();
  get(value: string): string | undefined {
    return this.#values.get(value);
  }
  set(value: string, reference: string): void {
    this.#values.set(value, reference);
  }
  values() {
    return this.#values.values();
  }
  [Symbol.iterator]() {
    return this.#values[Symbol.iterator]();
  }
}

export type SecretEntries = Pick<SecretDictionary, "values" | typeof Symbol.iterator>;
