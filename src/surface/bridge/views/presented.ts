// A thing on a surface: what it is and what it has, in the stacks its tool declared. Always the same stacks, in the
// same order; one with nothing in it says so. A program gives the reading; it never draws the thing.
import type { Language } from "../../../fields/languages.ts";
import { linesIn, said } from "../../../fields/phrases.ts";
import { authorDatum, authorName } from "./author-name.ts";
import { field, plain } from "../../../fields/json-values.ts";
import { OutsideDefect, programCall } from "../../../fields/program-call.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Tool, ViewRow } from "../../contract/shown-tool.ts";
import type { Presented, SurfacePorts } from "../ports/house-ports.ts";
import type { Changing } from "./rows.ts";
type Reading = Readonly<Record<string, unknown>>;
const isReading = (value: unknown): value is Reading =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Something the reading names by its id is another thing: its row opens it, whatever tool it is of. */
const named = (value: unknown): ViewRow | undefined => {
  const id = field(value, "id");
  if (typeof id !== "string") return undefined;
  const detail = field(value, "detail");
  return {
    title: plain(field(value, "text") ?? id),
    ...(detail === undefined ? {} : { detail: plain(detail) }),
    opens: id,
  };
};
/** One datum of the reading as rows: a thing it names opens; anything else is read under its label, said once,
 * or is the row that changes it when there is one. */
function rowsOf(value: unknown, label: string, where: string, changed?: (shown: string) => ViewRow | undefined) {
  const rows = (each: unknown, said: string): ViewRow[] => {
    if (each === undefined || each === null || each === "") return [];
    if (Array.isArray(each)) return each.flatMap((one, i) => rows(one, i ? "" : said));
    const thing = named(each);
    if (thing) return [thing];
    if (typeof each === "object") throw new OutsideDefect(new Error(`${where} is read as neither a datum nor a thing`));
    const text = plain(each);
    const action = changed?.(text);
    if (action) return [action];
    // Each written line gets a readable row; the viewport can then reach every line with the arrow keys.
    return text.split(/\r\n|\r|\n/u).map((detail, index) => ({ title: index ? "" : said, detail, still: true }));
  };
  return rows(value, label);
}
type Shown = ReturnType<Tool["view"]>;
/** A reading in the stacks declared for it. A datum no stack holds is a defect of the program. */
function stacked(
  stacks: readonly Presented[],
  reading: Reading,
  where: string,
  language: Language,
  changing?: Changing,
  name = (actor: string) => actor,
): Shown {
  const held = new Set(stacks.flatMap(stack => Object.keys(stack.reads)));
  const loose = Object.keys(reading).filter(key => !held.has(key));
  if (loose.length)
    throw new OutsideDefect(new Error(`${where} reads ${loose.join(", ")} and no stack of its presentation holds it`));
  return stacks.map(stack => {
    const rows = Object.entries(stack.reads).flatMap(([key, label]) =>
      rowsOf(
        authorDatum(key, reading[key], name),
        said(label, language),
        `${where}.${key}`,
        changing && (shown => changing(key, shown)),
      ),
    );
    return { title: said(stack.title, language), rows, empty: said(stack.empty, language) };
  });
}
/** The reading of one thing in the stacks declared for it: it is read, and none of its rows is an action. */
export function presented(stacks: readonly Presented[], reading: Reading, where: string, language: Language): Shown {
  /** What a thing names is opened by its number, counted down the whole thing: the first nine have one. */
  let things = 0;
  const numbered = (row: ViewRow): ViewRow =>
    row.opens === undefined || ++things > 9 ? row : { ...row, key: String(things) };
  return stacked(stacks, reading, where, language).map(stack => ({
    ...stack,
    rows: stack.rows.map(numbered),
    reads: true as const,
  }));
}
const readingOf = (view: string, where: string): Reading => {
  const [line = ""] = view.split("\n");
  const reading: unknown = programCall((): unknown => JSON.parse(line));
  if (!isReading(reading))
    throw new OutsideDefect(new Error(`${where} is not read as data: the first line of its view is not a reading`));
  return reading;
};
/** What a tool reads of its own, in the stacks declared for it: a datum an act changes is the row that starts that
 * act, and what it names of another thing opens it. */
export const ownView = (
  stacks: readonly Presented[],
  view: string,
  where: string,
  changing: Changing,
  name: (actor: string) => string,
  language: Language,
): Shown => stacked(stacks, readingOf(view, where), where, language, changing, name);
/** What a tool reads of one of its things, as stacks: asked of the tool each time, as whoever looks reads it. */
export const thingView =
  <X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, stacks: readonly Presented[]) =>
  (target: string): Shown => {
    if (!stacks.length) throw new OutsideDefect(new Error(`${tool.id} does not say how its things are presented`));
    const view = linesIn(
      programCall(tool.view.bind(tool), ports.state(), target, { ...ports.limits, now: ports.now() }),
      ports.language,
    );
    const reading = Object.fromEntries(
      Object.entries(readingOf(view, target)).map(([key, value]) => [key, authorDatum(key, value, authorName(ports))]),
    );
    return presented(stacks, reading, target, ports.language);
  };
