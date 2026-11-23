// Applies the common mechanical check to a mind's controls; one a rule marks waits for the supervisor's verdict.
import { type Text } from "../../fields/phrases.ts";
import { randomUUID } from "node:crypto";
import { mechanicalRules, requiresSupervision } from "../../tools/execution/mechanical-rules.ts";
import { coreRuleSchema } from "../../tools/rules/rule-core-actions.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewPort } from "../../tools/minds/mind-review.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
import type { MindRuntimeHouse } from "./mind-runtime-options.ts";
/** A control passes, stops on a rule (the turn ends, as a block), or is rejected by the supervisor with words. */
type ControlCheck = Readonly<{ ok: true }> | Readonly<{ ok: false; reason?: Text }>;
export async function ruleControl<X extends Program>(
  house: MindRuntimeHouse<X>,
  turn: TurnContext,
  cause: readonly string[],
  proposal: ProposedAct,
  supervision: Readonly<{ review: ReviewPort; supervised: boolean }>,
  tool = "journey",
): Promise<ControlCheck> {
  const schema = coreRuleSchema(tool, proposal.act);
  const id = cause[0];
  const { scope } = turn;
  if (!schema || !id) return { ok: false };
  const origin = { id, by: scope.actor, process: scope.process };
  const action = { tool, act: proposal.act };
  const ports = { ...house.execution, judge: supervision.supervised };
  const stopped = () => {
    const result = mechanicalRules(ports, origin, action, schema, proposal.input);
    if (!result) return false;
    house.execution.bus.together(() =>
      result.effects.forEach(event => house.execution.bus.emit({ ...event, cause, process: scope.process })),
    );
    return true;
  };
  if (stopped()) return { ok: false };
  if (!supervision.supervised || !requiresSupervision(ports, origin, action, schema, proposal.input))
    return { ok: true };
  const verdict = await supervision.review.review({
    id: `proposal:${randomUUID()}`,
    reason: "rule",
    scope,
    through: house.execution.state().through,
    acts: [proposal],
    turn,
  });
  // A rule may have changed while the control waited: the rules in force decide again before it is applied.
  if (verdict.outcome === "passed") return stopped() ? { ok: false } : { ok: true };
  return { ok: false, reason: rulesTexts.verdict(verdict.outcome, verdict.text) };
}
