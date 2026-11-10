/** The socket and HTTP boundary carry JSON, deliberately independent of core types. */
export function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value ? Reflect.get(value, key) : undefined;
}
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
export const string = (value: unknown): string => (typeof value === "string" ? value : "");
export const at = (value: unknown, ...keys: readonly string[]): unknown => keys.reduce(field, value);
export const parse = (text: string): unknown => JSON.parse(text);
