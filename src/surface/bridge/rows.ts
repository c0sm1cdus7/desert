// A tool's text view read as rows: what has an id opens; the rest is a label, in the program's words, and its value.
import type { ViewRow } from "../contract.ts";
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
type Labels = (key: string) => string;
/** Something with an id is one row, in the words it wrote; the rest is a label and its value. */
const rowsOf = (value: unknown, label: Labels, key = ""): ViewRow[] => {
  if (Array.isArray(value)) return value.flatMap(item => rowsOf(item, label, key));
  if (value === null || value === undefined || value === "") return [];
  if (typeof value !== "object")
    return [key ? { title: label(key), detail: text(value), still: true } : { title: text(value) }];
  const id = field(value, "id");
  if (typeof id !== "string") return Object.entries(value).flatMap(([name, item]) => rowsOf(item, label, name));
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
export function rowsIn(view: string, label: Labels): ViewRow[] {
  return view
    .split("\n")
    .filter(Boolean)
    .flatMap(line => rowsOf(parse(line) ?? line, label));
}
/** Every thing the tool lists is reachable: what the view did not show still gets its row. */
export function listedIn(targets: readonly string[], shown: readonly ViewRow[]): readonly ViewRow[] {
  const openable: readonly ViewRow[] = shown.map(({ opens, ...row }) =>
    opens && targets.includes(opens) ? { ...row, opens } : row,
  );
  const rest = targets.filter(id => !shown.some(row => row.opens === id));
  return [...openable, ...rest.map(id => ({ title: decodeURIComponent(id), opens: id }))];
}
