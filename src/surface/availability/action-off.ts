// The reason an action is unavailable, shared by its rows and every derived guarantee.
import { allowed } from "../../house/house.ts";
import { genericTexts } from "../../texts/generic-surface.texts.ts";
import { programOffered, programAlso } from "../../tools/program-run.ts";
import type { ProgramAct } from "../../tools/promises.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { Field } from "../contract.ts";
import { withoutChoices } from "../bridge/picked.ts";

/** One reason for an identity at a destination and instant; later rules are read only when needed. */
export function actionOff<X extends Program>(
  act: ProgramAct<X>,
  state: State<X>,
  tool: string,
  target: string,
  at: number,
  first: () => Field | null,
  from?: string,
): string | undefined {
  if (!allowed(state.house, state.by, tool)) return genericTexts.notHeld;
  return (
    programOffered(act, state, target, at) ??
    (from === undefined ? undefined : programAlso(act, state, from, at)) ??
    withoutChoices(first())
  );
}
