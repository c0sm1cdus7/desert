// A tool's text view read as rows: what has an id opens; the rest is a label, in the program's words, and its value.
import type { ViewRow } from "../shown-tool.ts";
export const field = (value: unknown, key: string): unknown =>
  value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined;
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const parse = (line: string): unknown => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};
const text = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));
export type Labels = (key: string) => string;
/** The row of a datum that an act changes, when there is one: asked with the datum's name and what it reads. */
export type Changing = (key: string, shown: string) => ViewRow | undefined;
/** Something with an id is one row, in the words it wrote; the rest is a label and its value. A datum that holds
 * several values says its label once, on the first. */
const rowsOf = (value: unknown, label: Labels, changing?: Changing, key = ""): ViewRow[] => {
  if (Array.isArray(value))
    return value
      .flatMap(item => rowsOf(item, label, changing, key))
      .map((row, i) => (i && row.still ? { ...row, title: "" } : row));
  if (value === null || value === undefined || value === "") return [];
  if (typeof value !== "object") {
    if (!key) return [{ title: text(value) }];
    return [changing?.(key, text(value)) ?? { title: label(key), detail: text(value), still: true }];
  }
  const id = field(value, "id");
  if (typeof id !== "string")
    return Object.entries(value).flatMap(([name, item]) => rowsOf(item, label, changing, name));
  const detail = field(value, "detail") ?? field(value, "by") ?? field(value, "author");
  const title = text(field(value, "text") ?? field(value, "name") ?? id);
  return [{ title, ...(detail === undefined ? {} : { detail: text(detail) }), opens: id }];
};
/** A summary that is structured says, on a Menu row, only how many. */
export const briefOf = (summary: string): string => {
  const parsed = summary.split("\n").map(parse);
  if (!parsed.every(Array.isArray)) return summary;
  return String(parsed.reduce((sum: number, list: unknown[]) => sum + list.length, 0) || "");
};
export function rowsIn(view: string, label: Labels, changing?: Changing): ViewRow[] {
  return view
    .split("\n")
    .filter(Boolean)
    .flatMap(line => rowsOf(parse(line) ?? line, label, changing));
}
/** Every thing the tool lists is reachable: what the view did not show still gets its row. */
export function listedIn(targets: readonly string[], shown: readonly ViewRow[], complete = true): readonly ViewRow[] {
  const known = new Set(targets);
  const listed = new Set(shown.map(row => row.opens));
  const openable: readonly ViewRow[] = shown.map(({ opens, ...row }) =>
    opens && known.has(opens) ? { ...row, opens } : row,
  );
  const rest = complete ? targets.filter(id => !listed.has(id)) : [];
  return [...openable, ...rest.map(id => ({ title: decodeURIComponent(id), opens: id }))];
}
