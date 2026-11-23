// What the fields of a program's acts need from the rest of the program, checked when it is composed: a day held
// to today needs how its country counts days, and a thing made where it is picked needs the act that makes it.
import { everySaid, isPhrase } from "../../../fields/phrases.ts";
import { short } from "../../../tools/act-words.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Shown } from "../ports/house-ports.ts";
type Field = Readonly<Record<string, unknown>>;
const isField = (value: unknown): value is Field =>
  value !== null && typeof value === "object" && !Array.isArray(value);
/** Every field of what an act takes, however deep it stands. */
const fieldsIn = (schema: unknown, seen = new WeakSet<object>()): readonly Field[] => {
  if (Array.isArray(schema)) return schema.flatMap(child => fieldsIn(child, seen));
  if (!isField(schema) || seen.has(schema)) return [];
  seen.add(schema);
  return [schema, ...Object.values(schema).flatMap(child => fieldsIn(child, seen))];
};
/** Only a thing field uses empty as metadata; a program can still have a datum named empty. */
function emptyReason(field: Field, where: string): void {
  if (typeof field.of !== "string") return;
  const empty = typeof field.empty === "string" || isPhrase(field.empty) ? field.empty : undefined;
  if (field.empty !== undefined && (empty === undefined || everySaid(empty).trim() === ""))
    throw new Error(`${where} has no usable empty reason`);
  if (typeof field.makes !== "string" && empty === undefined)
    throw new Error(`${where} picks a thing without a maker or an empty reason`);
  if (empty !== undefined) short(empty);
}
/** A field that cannot work as declared is a defect of the program: it shows when the program is composed, not on
 * the screen of whoever reaches that question first. */
function check<X extends Program>(field: Field, tools: readonly ProgramTool<X>[], shown: Shown<X>, where: string) {
  const dated = field.mask === "day" || field.suggests === "today" || field.last === "today";
  if (dated && !shown.day) throw new Error(`${where} holds a day to today and the program does not say what day it is`);
  const maker = typeof field.makes === "string" ? field.makes : undefined;
  emptyReason(field, where);
  const made = tools.find(other => other.id === field.of)?.acts[maker ?? ""];
  if (maker !== undefined && made?.on !== "tool")
    throw new Error(`${where} makes a thing with an act that makes none: ${maker}`);
}
export function auditFields<X extends Program>(tools: readonly ProgramTool<X>[], shown: Shown<X>): void {
  for (const tool of tools)
    for (const [name, act] of Object.entries(tool.acts))
      for (const field of fieldsIn(act.input)) check(field, tools, shown, `${tool.id} ${name}`);
}
