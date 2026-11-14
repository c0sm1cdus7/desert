import { programCall } from "../boundaries/program-call.ts";
import { effect } from "../../journal/events.ts";
import type { Decision } from "../execute.ts";
import type { ActContext, ActResult, Program, ToolAct } from "../tool-contract.ts";
function entryEffect<X extends Program>(
  tool: string,
  target: string,
  by: string,
  result: Extract<ActResult<X>, { status: "accepted" }>,
) {
  const { text = "", detail, attention, silent, made, diagnostic } = result;
  return effect(
    "tool-entry",
    {
      tool,
      target,
      author: by,
      text,
      ...(detail !== undefined ? { detail } : {}),
      ...(attention !== undefined ? { attention } : {}),
      ...(silent !== undefined ? { silent } : {}),
      ...(made !== undefined ? { made } : {}),
      ...(diagnostic !== undefined ? { diagnostic } : {}),
    },
    by,
  );
}
export function decisionOf<X extends Program>(
  result: ActResult<X>,
  act: ToolAct<X>,
  context: ActContext<X>,
  tool: string | undefined,
  option: string,
): Decision<X> {
  const notice = {
    ...(result.cleanupPending ? { cleanupPending: true as const } : {}),
    ...(result.anchorPending ? { anchorPending: true as const } : {}),
  };
  if ("reason" in result)
    return { status: result.status, reason: result.reason, effects: result.effects ?? [], ...notice };
  if (result.status === "inconclusive") return { status: "inconclusive", effects: result.effects ?? [], ...notice };
  const reason = programCall(act.reject?.bind(act), context, result);
  if (reason) return { status: "rejected", reason, effects: [], ...notice };
  if (tool === undefined) return { status: "accepted", effects: result.effects ?? [], ...notice };
  const { by, target: original } = context;
  const { effects = [], private: receipt, cleanupPending, anchorPending } = result;
  const target = result.target ?? original;
  const text = result.text ?? "";
  const done = effect("act-done", { object: target, act: option, text }, by);
  const entry = entryEffect(tool, target, by, result);
  return {
    status: "accepted",
    effects: [...effects, done, entry],
    private: receipt,
    ...(cleanupPending ? { cleanupPending } : {}),
    ...(anchorPending ? { anchorPending } : {}),
  };
}
