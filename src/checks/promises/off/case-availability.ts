// Read a case's destination and fixed answers before asking the shared availability rule.
import { asking } from "../../../surface/bridge/questions/asking.ts";
import { actionOff } from "../../../surface/bridge/acts/action-off.ts";
import type { Case } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Seat } from "../promised-keys.ts";
import type { Aim } from "../promised-stage.ts";
/** The actual first question, including any answers fixed by the row that offers the action. */
export function actionUnavailable<X extends Program>(
  seat: Seat<X>,
  aim: Aim<X>,
  on: string,
  answers: readonly string[] = [],
  from?: string,
): string | undefined {
  const tool = seat.tools.find(tool => tool.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  const state = seat.state();
  const at = seat.now();
  const fixed =
    from === undefined ? answers : asking(aim.act.input, seat.words).leading(aim.act.also?.with(state, from, at) ?? {});
  return actionOff(aim.act, state, aim.tool.id, on, at, () => act?.next(fixed, on) ?? null, from, aim.name);
}
/** Where a case takes a row supplied by another tool. */
export const caseOrigin = <X extends Program>(aim: Aim<X>, kase: Case<X>) =>
  kase.from !== undefined && aim.act.also ? { tool: aim.act.also.tool, target: kase.from } : undefined;
