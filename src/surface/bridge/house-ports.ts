// What a bridge needs from a running house, and the two moves every bridge makes: settle an act, attend then act.
import type { Act } from "../../catalogs/acts.ts";
import type { ViewLimits } from "../../catalogs/levers.ts";
import type { ExecutionResult } from "../../tools/execute.ts";
import type { Product, State, ToolRegistry } from "../../tools/tool-contract.ts";
import type { ViewRow } from "../contract.ts";
/** What the surface needs from a running house; nothing here knows how it runs. */
export interface HousePorts<X extends Product> {
  readonly me: string;
  /** The house as this identity reads it. */
  readonly state: () => State<X>;
  readonly registry: ToolRegistry<X>;
  readonly limits: ViewLimits;
  readonly act: (value: Act, through: number) => ExecutionResult<X>;
  readonly now: () => number;
  /** How a private receipt reads here, when the door has more to say than the receipt itself. */
  readonly receipt?: (secret: string) => string;
}
export type SurfacePorts<X extends Product> = Omit<HousePorts<X>, "act"> & {
  readonly act: (value: Act) => ExecutionResult<X>;
};
/** What a product calls its tools, their acts and their fields on a surface: a tool without words is not shown. */
export type ToolWords = Readonly<{ name: string; key: string; empty: string; system?: true }> &
  /** What heads the list of its things, and what heads one thing read on its own. */
  Readonly<{ listed: string; shown: string }> &
  Readonly<Record<"acts" | "done" | "fields", Readonly<Record<string, string>>>>;
export type SurfaceWords = Readonly<Record<string, ToolWords>>;
/** Every act answers later over a door: what the house decided, never the fact that it is still deciding. */
export const settle = <X extends Product>(result: ExecutionResult<X>) =>
  result.status === "processing" ? result.completion : Promise.resolve(result);
/** Acting on something starts by attending it, as anyone does; what comes back is what the house decided. */
export async function attendAndAct<X extends Product>(
  ports: SurfacePorts<X>,
  target: string,
  act: string,
  input: unknown,
) {
  const attended = await settle(ports.act({ act: "attend", input: { target } }));
  return attended.status === "accepted" ? settle(ports.act({ act, target, input })) : attended;
}
export const section = (title: string, rows: readonly ViewRow[], empty = "") => ({ title, rows, empty });
