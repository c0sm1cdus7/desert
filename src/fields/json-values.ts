// Shared readings of JSON values and the bounded whole-number schema.
import { Type } from "@sinclair/typebox";

/** An object value, excluding null and arrays. */
export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** An array value, without changing its items. */
export const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);

/** A named value of an object schema, excluding arrays. */
export const at = (schema: unknown, key: string): unknown => (isRecord(schema) ? schema[key] : undefined);

/** A named value of any object, including arrays. */
export const field = (value: unknown, key: string): unknown =>
  value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined;

/** An array as given, or an empty list for anything else. */
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** A string as written, or the JSON spelling of another value. */
export const plain = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));

/** The schema of an integer from zero through the largest safe integer. */
export const wholeNumber = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
