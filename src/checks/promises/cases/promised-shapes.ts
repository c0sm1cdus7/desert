// What was written in a shape is read in that shape: found in what a case says, and looked for in what is read.
import { shaped } from "../../../surface/formats/masks.ts";
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const shapesOf = (schema: unknown): string[] =>
  isRecord(schema) && schema.mask === "digits"
    ? list(schema.shapes).flatMap(shape => (typeof shape === "string" ? [shape] : []))
    : [];
/** Every datum of a case that was written in a shape of digits and reads differently once in it: the digits as
 * they were typed, which no reading may show bare. */
export function bareIn(schema: unknown, value: unknown): string[] {
  if (!isRecord(schema)) return [];
  const shapes = shapesOf(schema);
  if (shapes.length) return typeof value === "string" && shaped(shapes).shown(value) !== value ? [value] : [];
  const fields = Object.entries(isRecord(schema.properties) ? schema.properties : {});
  const inside = fields.flatMap(([key, field]) => bareIn(field, isRecord(value) ? value[key] : undefined));
  const arms = list(schema.anyOf).flatMap(arm => bareIn(arm, value));
  const items = list(value).flatMap(item => bareIn(schema.items, item));
  return [...inside, ...arms, ...items];
}
