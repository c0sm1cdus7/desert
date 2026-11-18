// Aplica el control mecánico común a los controles de journeys antes y después de sus esperas.
import { mechanicalRules } from "../../tools/execution/mechanical-rules.ts";
import { coreRuleSchema } from "../../tools/rules/rule-core-actions.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import type { MindRuntimeHouse } from "./mind-runtime-options.ts";
export function ruleControl<X extends Program>(
  house: MindRuntimeHouse<X>,
  scope: MindScope,
  cause: readonly string[],
  proposal: ProposedAct,
  tool = "journey",
): boolean {
  const schema = coreRuleSchema(tool, proposal.act);
  const id = cause[0];
  if (!schema || !id) return false;
  const origin = { id, by: scope.actor, process: scope.process };
  const result = mechanicalRules(house.execution, origin, { tool, act: proposal.act }, schema, proposal.input);
  if (!result) return true;
  house.execution.bus.together(() =>
    result.effects.forEach(event =>
      house.execution.bus.emit({
        ...event,
        cause: cause,
        process: scope.process,
      }),
    ),
  );
  return false;
}
