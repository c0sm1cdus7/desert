// What a bridge needs from a running house, and the two moves every bridge makes: settle an act, attend then act.
import type { Act } from "../../catalogs/acts.ts";
import type { ViewLimits } from "../../catalogs/levers.ts";
import type { ExecutionResult } from "../../tools/execute.ts";
import type { Program, State, ToolRegistry } from "../../tools/tool-contract.ts";
import type { Screen } from "../contract.ts";
import type { Tool as SurfaceTool, ViewRow } from "../shown-tool.ts";
import type { Locale } from "../masks.ts";
import type { ProgramTool } from "../../tools/promises.ts";
/** What the surface needs from a running house; nothing here knows how it runs. */
export interface HousePorts<X extends Program> {
  readonly me: string;
  /** The house as this identity reads it. */
  readonly state: () => State<X>;
  readonly registry: ToolRegistry<X>;
  readonly limits: ViewLimits;
  readonly act: (value: Act, through: number) => ExecutionResult<X>;
  readonly now: () => number;
  /** How this device reaches the house right now. */
  readonly connection: () => Screen["state"];
  /** Calls back whenever something in the house changed. */
  readonly watch: (changed: () => void) => () => void;
  /** How a private receipt reads here, when the door has more to say than the receipt itself. */
  readonly receipt?: (secret: string) => string;
}
export type SurfacePorts<X extends Program> = Omit<HousePorts<X>, "act"> & {
  readonly act: (value: Act) => ExecutionResult<X>;
};
/** What a program calls a tool where a person reads it; its acts say their own words where they are declared. */
export type ToolWords = Readonly<{ name: string; key: string; empty: string; system?: true }> &
  /** What heads the list of its things, what heads one thing read on its own, and the label of each thing it reads. */
  Readonly<{ listed: string; shown: string; reads: Readonly<Record<string, string>> }>;
export type SurfaceWords = Readonly<Record<string, ToolWords>>;
/** How a program is shown: its words, how its country writes money and days, and the screens that are its own. */
export type Shown<X extends Program> = Readonly<{ words: SurfaceWords; locale: Locale }> &
  Readonly<{ screens?: Readonly<Record<string, ProgramScreen<X>>> }>;
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
) {
  const attended = await settle(ports.act({ act: "attend", input: { target } }));
  return attended.status === "accepted" ? settle(ports.act({ act, target, input })) : attended;
}
export const section = (title: string, rows: readonly ViewRow[], empty = "") => ({ title, rows, empty });
