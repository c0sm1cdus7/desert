import { programCall } from "../boundaries/program-call.ts";
import { effect } from "../../journal/events.ts";
import type { Decision } from "../execute.ts";
import type { ActContext, ActResult, Program, ToolAct } from "../tool-contract.ts";
/** A private result's act-done goes to its recipient alone, like its entry. */
const privateTo = (recipient?: string) => (recipient ? { recipient } : {});
export function decisionOf<X extends Program>(
  result: ActResult<X>,
  act: ToolAct<X>,
  context: ActContext<X>,
  tool: string | undefined,
  option: string,
): Decision<X> {
  const notice = result.cleanupPending ? { cleanupPending: true as const } : {};
  if ("reason" in result)
    return { status: result.status, reason: result.reason, effects: result.effects ?? [], ...notice };
  if (result.status === "inconclusive") return { status: "inconclusive", effects: result.effects ?? [], ...notice };
  const reason = programCall(act.reject?.bind(act), context, result);
  if (reason) return { status: "rejected", reason, effects: [], ...notice };
  if (tool === undefined) return { status: "accepted", effects: result.effects ?? [], ...notice };
  const { by, target: original } = context;
  const {
    text = "",
    target = original,
    status: _status,
    effects = [],
    private: receipt,
    cleanupPending,
    ...data
  } = result;
  const done = effect("act-done", { object: target, act: option, text, ...privateTo(data.recipient) }, by);
  const entry = effect("tool-entry", { tool, target, author: by, text, ...data }, by);
  return {
    status: "accepted",
    effects: [...effects, done, entry],
    private: receipt,
    ...(cleanupPending ? { cleanupPending } : {}),
  };
}
