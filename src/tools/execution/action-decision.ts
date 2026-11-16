import { programCall } from "../../fields/program-call.ts";
import { effect } from "../../house/facts.ts";
import { effectRefusal } from "./effect-authority.ts";
import type { Execution } from "../execution-contract.ts";
import type { Decision } from "../execute.ts";
import type { ActContext, ActResult, OwnAct, Program, Tool, ToolAct } from "../tool-contract.ts";
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
function decisionOf<X extends Program>(
  result: ActResult<X>,
  act: ToolAct<X>,
  context: ActContext<X>,
  tool: string | undefined,
  option: string,
  validate: () => string | undefined,
): Decision<X> {
  const notice = {
    ...(result.cleanupPending ? { cleanupPending: true as const } : {}),
    ...(result.anchorPending ? { anchorPending: true as const } : {}),
  };
  const reason = result.status === "accepted" ? programCall(act.reject?.bind(act), context, result) : undefined;
  const invalid = validate();
  if (invalid || reason) return { status: "rejected", reason: invalid ?? reason ?? "", effects: [], ...notice };
  if ("reason" in result)
    return { status: result.status, reason: result.reason, effects: result.effects ?? [], ...notice };
  if (result.status === "inconclusive") return { status: "inconclusive", effects: result.effects ?? [], ...notice };
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
export function checkedDecision<X extends Program>(
  ports: Execution<X>,
  result: ActResult<X>,
  act: ToolAct<X>,
  context: ActContext<X>,
  tool: Tool<X> | undefined,
  offered: OwnAct<X> | undefined,
  option: string,
): Decision<X> {
  const source = offered ? "own" : "tool";
  const house = offered && ports.houseOwn?.(offered) === true;
  return {
    ...decisionOf(result, act, context, offered ? undefined : tool?.id, option, () =>
      effectRefusal(ports, result, context, tool, house ? "house" : source),
    ),
    ...(act.output ? { output: true } : {}),
  };
}
