// The reason an action is unavailable, shared by its rows and every derived guarantee.
import { allowedAct } from "../../../house/kit.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { programOffered, programAlso } from "../../../tools/program-run.ts";
import type { ProgramAct } from "../../../tools/promises.ts";
import type { Program, State } from "../../../tools/tool-contract.ts";
import type { Field } from "../../contract/contract.ts";
import { withoutChoices } from "../picking/picked.ts";
/** One reason for an identity at a destination and instant; later rules are read only when needed. */
export function actionOff<X extends Program>(
  act: ProgramAct<X>,
  state: State<X>,
  tool: string,
  target: string,
  at: number,
  first: () => Field | null,
  from: string | undefined,
  name: string,
): string | undefined {
  if (!state.house.grants.has(state.by)) return toolTexts.unassigned;
  if (!allowedAct(state.house, state.by, tool, name)) return toolTexts.kitRefusal(tool);
  return (
    programOffered(act, state, target, at) ??
    (from === undefined ? undefined : programAlso(act, state, from, at)) ??
    withoutChoices(first())
  );
}
