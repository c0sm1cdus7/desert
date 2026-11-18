// Carries the erased installation boundary and projects callbacks onto only their own state.
import type { Program, State, Slices } from "../tool-contract.ts";
import type { ProgramTool } from "../promises-contract.ts";
import type { ProgramWords } from "./program.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
export type InstalledGroup = Readonly<{
  id: string;
  folder: string;
  palabras: ProgramWords;
  tool: ProgramTool<Program>;
}>;
export type InstalledProgram = Readonly<{
  tool: ProgramTool<Program>;
  groups: readonly InstalledGroup[];
  words: ProgramWords;
  initial: unknown;
  step: Slices<Program>["step"][string];
}>;
/** Only the installation that created the slice calls this boundary with its own id. */
export function localState<X extends Program>(state: State<Program>, id: string): State<X>;
export function localState(state: State<Program>, id: string): State<Program> {
  return readonlyState({ ...state, tools: { own: state.tools[id] } });
}
