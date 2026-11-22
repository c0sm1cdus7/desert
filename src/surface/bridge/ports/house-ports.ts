// What a bridge needs from a running house, and the two moves every bridge makes: settle an act, attend then act.
import type { ExecutionDestination } from "../../../fields/device-protocol.ts";
import type { Act } from "../../../house/own-acts.ts";
import type { ViewLimits, Program, State, ToolRegistry } from "../../../tools/tool-contract.ts";
import type { ExecutionResult } from "../../../tools/execute.ts";

import type { Screen } from "../../contract/contract.ts";
import type { Tool as SurfaceTool, ViewRow } from "../../contract/shown-tool.ts";
import type { Locale } from "../../formats/masks.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
/** What the surface needs from a running house; nothing here knows how it runs. */
export interface HousePorts<X extends Program> {
  readonly me: string;
  /** Opening diagnostics are transient; they never become journal facts. */
  readonly openingNotices?: () => readonly string[];
  /** The house as this identity reads it. */
  readonly state: () => State<X>;
  readonly registry: ToolRegistry<X>;
  readonly limits: Omit<ViewLimits, "now">;
  readonly act: (value: Act, through: number) => ExecutionResult<X>;
  /** Repeated observations from drawing may share an in-flight request; personal acts never do. */
  readonly observe?: (value: Act) => ExecutionResult<X>;
  readonly now: () => number;
  readonly defect: (error: unknown, tool: string, target: string, option: string) => string;
  /** How this device reaches the house right now. */
  readonly connection: () => Screen["state"];
  /** Calls back whenever something in the house changed. */
  readonly watch: (changed: () => void) => () => void;
  /** How a private receipt reads here, when the door has more to say than the receipt itself. */
  readonly receipt?: (secret: string) => string;
}
export type SurfacePorts<X extends Program> = Omit<HousePorts<X>, "act" | "observe"> & {
  readonly act: (value: Act) => ExecutionResult<X>;
  readonly observe?: (value: Act) => ExecutionResult<X>;
};
/** What a program calls a tool where a person reads it; its acts say their own words where they are declared. */
type Called = Readonly<{ name: string; key: string; system?: true }>;
/** A tool of things: what it says with none, what heads their list, the label of each datum read on that list,
 * and how one of its things is presented: its stacks, in order. */
type Lists = Readonly<{ empty: string; listed: string }> &
  Readonly<{ reads: Readonly<Record<string, string>>; presents: readonly Presented[] }>;
/** A tool that reads data of its own: the stacks that data goes in, in order, as the stacks of a thing. */
type Itself = Readonly<{ itself: readonly Presented[] }>;
/** A tool lists things, reads data of its own, or both: its data first, then its things. */
export type ToolWords = Called & (Lists | Itself);
/** One stack of a thing: its title, what it says with nothing in it, and each datum of the reading that goes in
 * it, with its label. */
export type Presented = Readonly<{ title: string; empty: string }> &
  Readonly<{ reads: Readonly<Record<string, string>> }>;
export type SurfaceWords = Readonly<Record<string, ToolWords>>;
/** The words of a tool for the things it lists, when it lists any. */
export const listsOf = (words?: ToolWords): Lists | undefined => (words && "listed" in words ? words : undefined);
/** The stacks of what a tool reads of its own, when it reads any. */
export const itselfOf = (words?: ToolWords): readonly Presented[] => (words && "itself" in words ? words.itself : []);
/** The label of every datum a tool itself reads: on the list of its things, and in the stacks of its own data. */
export const ownReads = (words?: ToolWords): Readonly<Record<string, string>> => ({
  ...listsOf(words)?.reads,
  ...Object.fromEntries(itselfOf(words).flatMap(stack => Object.entries(stack.reads))),
});
/** How a program is shown: its words, how its country writes money and days, and the screens that are its own. */
export type Shown<X extends Program> = Readonly<{ words: SurfaceWords; locale: Locale }> &
  Readonly<{ screens?: Readonly<Record<string, ProgramScreen<X>>> }> &
  /** How its country writes an instant, the day and the hour: what was done to a thing is read with it. And the
   * day of its calendar an instant falls on, as year-month-day: a day that is usually today opens on it. And the
   * hour of the Barra in its zone, as hours and minutes: without it, the hour is the process's own. */
  Readonly<{ moment?: (at: number) => string; day?: (at: number) => string; hour?: (at: number) => string }>;
/** The acts and menus of a tool as its declarations offer them: a screen passes them on as they are. */
export type ScreenActs = Pick<SurfaceTool, "acts" | "actsOn" | "menusOn">;
/** How a row starts a declared act of a thing: its own key, title or detail when it wants them; and what the thing
 * has today, in the shape the act takes, asked whole or from one answer up to another. */
export type Starting = Readonly<{ key?: string; title?: string; detail?: string }> &
  Readonly<{ today?: unknown; asks?: readonly [from: number, until?: number] }>;
export type Start = (act: string, target: string, how?: Starting) => ViewRow;
/** A tool that needs more than rows brings its own screen; its acts still come from their declarations, and a row
 * of it starts one of them only through `start`. */
export type ProgramScreen<X extends Program> = (
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  words: ToolWords,
  acts: ScreenActs,
  start: Start,
) => SurfaceTool;
/** Every act answers later over a door: what the house decided, never the fact that it is still deciding. */
export const settle = <X extends Program>(result: ExecutionResult<X>) =>
  result.status === "processing" ? result.completion : Promise.resolve(result);
/** Acting on something starts by attending it, as anyone does; what comes back is what the house decided. */
export async function attendAndAct<X extends Program>(
  ports: SurfacePorts<X>,
  target: string,
  act: string,
  input: unknown,
  destination?: ExecutionDestination,
) {
  const attended = await settle(ports.act({ act: "attend", input: { target } }));
  return attended.status === "accepted"
    ? settle(ports.act({ act, target, input, ...(destination ? { destination } : {}) }))
    : attended;
}
export const section = (title: string, rows: readonly ViewRow[], empty = "") => ({ title, rows, empty });
/** Where a tool is opened from: its section of the Menu. */
export const placed = ({ key, system }: ToolWords): SurfaceTool["place"] => ({
  key,
  section: system ? "system" : "tools",
});
