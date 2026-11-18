// A tool's text view read as rows: what has an id opens; the rest is a label, in the program's words, and its value.
import { authorDatum } from "./author-name.ts";
import { plain, field } from "../../../fields/json-values.ts";
import type { ViewRow } from "../../contract/shown-tool.ts";

const parse = (line: string): unknown => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};

export type Labels = (key: string) => string;
/** The row of a datum that an act changes, when there is one: asked with the datum's name and what it reads. */
export type Changing = (key: string, shown: string) => ViewRow | undefined;
/** Something with an id is one row, in the words it wrote; the rest is a label and its value. A datum that holds
 * several values says its label once, on the first. */
const rowsOf = (
  value: unknown,
  label: Labels,
  changing?: Changing,
  key = "",
  name = (actor: string) => actor,
): ViewRow[] => {
  if (Array.isArray(value))
    return value
      .flatMap(item => rowsOf(item, label, changing, key, name))
      .map((row, i) => (i && row.still ? { ...row, title: "" } : row));
  value = authorDatum(key, value, name);
  if (value === null || value === undefined || value === "") return [];
  if (typeof value !== "object") {
    if (!key) return [{ title: plain(value) }];
    return [changing?.(key, plain(value)) ?? { title: label(key), detail: plain(value), still: true }];
  }
  const id = field(value, "id");
  if (typeof id !== "string")
    return Object.entries(value).flatMap(([key, item]) => rowsOf(item, label, changing, key, name));
  const detail =
    field(value, "detail") ??
    authorDatum("by", field(value, "by"), name) ??
    authorDatum("author", field(value, "author"), name);
  const title = plain(field(value, "text") ?? field(value, "name") ?? id);
  return [{ title, ...(detail === undefined ? {} : { detail: plain(detail) }), opens: id }];
};
/** A summary that is structured says, on a Menu row, only how many. */
export const briefOf = (summary: string): string => {
  const parsed = summary.split("\n").map(parse);
  if (!parsed.every(Array.isArray)) return summary;
  return String(parsed.reduce((sum: number, list: unknown[]) => sum + list.length, 0) || "");
};
export function rowsIn(view: string, label: Labels, changing?: Changing, name = (actor: string) => actor): ViewRow[] {
  return view
    .split("\n")
    .filter(Boolean)
    .flatMap(line => rowsOf(parse(line) ?? line, label, changing, "", name));
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
