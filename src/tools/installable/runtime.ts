// Carries the erased installation boundary and projects callbacks onto only their own state.
import type { Program, State, Slices } from "../tool-contract.ts";
import type { ProgramTool } from "../promises-contract.ts";
import type { ProgramWords } from "./program.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
import type { ContractReadings } from "../contract-port.ts";
export type InstalledGroup = Readonly<{
  id: string;
  folder: string;
  words: ProgramWords;
  tool: ProgramTool<Program>;
}>;
export type InstalledProgram = Readonly<{
  tool: ProgramTool<Program>;
  groups: readonly InstalledGroup[];
  words: ProgramWords;
  initial: unknown;
  step: Slices<Program>["step"][string];
}>;
/** What a program reads from its providers in a given state, when it requests any: composing installs it. */
export type ProgramReadings = (state: State<Program>) => ContractReadings;
/** Only the installation that created the slice calls this boundary with its own id; it adds what the program reads
 * from its providers everywhere but while folding. */
export function localState<X extends Program>(state: State<Program>, id: string, readings?: ContractReadings): State<X>;
export function localState(state: State<Program>, id: string, readings?: ContractReadings): State<Program> {
  return readonlyState({ ...state, tools: { own: state.tools[id] }, ...(readings ? { readings } : {}) });
}
/** The state every callback but the fold receives: its own slice and, when it requests any, its readings. */
export const ownState =
  <X extends Program>(id: string, readings?: ProgramReadings) =>
  (state: State<Program>): State<X> =>
    localState<X>(state, id, readings?.(state));
