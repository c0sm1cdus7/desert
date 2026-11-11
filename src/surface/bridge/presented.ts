// A thing on a surface: what it is and what it has, in the stacks its tool declared. Always the same stacks, in the
// same order; one with nothing in it says so. A program gives the reading; it never draws the thing.
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Tool, ViewRow } from "../shown-tool.ts";
import type { Presented, SurfacePorts } from "./house-ports.ts";
import { field } from "./rows.ts";

type Reading = Readonly<Record<string, unknown>>;
const isReading = (value: unknown): value is Reading =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));
/** Something the reading names by its id is another thing: its row opens it, whatever tool it is of. */
const named = (value: unknown): ViewRow | undefined => {
  const id = field(value, "id");
  if (typeof id !== "string") return undefined;
  const detail = field(value, "detail");
  return {
    title: text(field(value, "text") ?? id),
    ...(detail === undefined ? {} : { detail: text(detail) }),
    opens: id,
  };
};
/** One datum of the reading as rows: a thing it names opens; anything else is read under its label, said once. */
function rowsOf(value: unknown, label: string, where: string): ViewRow[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap((each, i) => rowsOf(each, i ? "" : label, where));
  const thing = named(value);
  if (thing) return [thing];
  if (typeof value === "object") throw new Error(`${where} is read as neither a datum nor a thing`);
  return [{ title: label, detail: text(value), still: true }];
}
type Shown = ReturnType<Tool["view"]>;
/** The reading of one thing in the stacks declared for it. A datum no stack holds is a defect of the program. */
export function presented(stacks: readonly Presented[], reading: Reading, where: string): Shown {
  const held = new Set(stacks.flatMap(stack => Object.keys(stack.reads)));
  const loose = Object.keys(reading).filter(key => !held.has(key));
  if (loose.length) throw new Error(`${where} reads ${loose.join(", ")} and no stack of its presentation holds it`);
  /** What a thing names is opened by its number, counted down the whole thing: the first nine have one. */
  let things = 0;
  const numbered = (row: ViewRow): ViewRow =>
    row.opens === undefined || ++things > 9 ? row : { ...row, key: String(things) };
  return stacks.map(stack => {
    const rows = Object.entries(stack.reads).flatMap(([key, label]) =>
      rowsOf(reading[key], label, `${where}.${key}`).map(numbered),
    );
    return { title: stack.title, rows, empty: stack.empty, reads: true as const };
  });
}
/** What a tool reads of one of its things, as stacks: asked of the tool each time, as whoever looks reads it. */
export const thingView =
  <X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, stacks: readonly Presented[]) =>
  (target: string): Shown => {
    if (!stacks.length) throw new Error(`${tool.id} does not say how its things are presented`);
    const [line = ""] = tool.view(ports.state(), target, { ...ports.limits, now: ports.now() }).split("\n");
    const reading: unknown = JSON.parse(line);
    if (!isReading(reading)) throw new Error(`${tool.id} does not read ${target} as a thing`);
    return presented(stacks, reading, target);
  };
