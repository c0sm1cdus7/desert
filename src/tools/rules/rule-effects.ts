// Keeps programs or own acts from forging rules and validates the concrete core act.
import type { Text } from "../../fields/phrases.ts";
import type { House } from "../../house/members.ts";
import type { HouseEmission } from "../../house/facts.ts";
import type { ActContext, Program, Tool } from "../tool-contract.ts";
import type { Execution } from "../execute.ts";
import { isRulesTool } from "./rules.ts";
import { rulesTexts as words } from "../../texts/rules.texts.ts";
import { effectRefusalTexts } from "../../texts/tools.texts.ts";
import { actionSchema, versionProblem } from "./rule-actions.ts";
import { ruleProblem } from "../../house/rules/rule-predicate.ts";
export function ruleEffectProblem<X extends Program>(
  ports: Execution<X>,
  house: House,
  event: HouseEmission,
  context: ActContext<X>,
  tool?: Tool<X>,
): Text | undefined {
  if (!tool || !isRulesTool(tool)) return effectRefusalTexts.houseFact;
  const option = ports.state().acts.get(context.id ?? "")?.data.option;
  if (event.kind === "rule-versioned") {
    if (option !== "save" && option !== "propose") return words.invalid;
    if (option === "save" && context.by !== house.admin) return words.only;
    const { definition, version, previous } = event.data;
    const latest = house.rules.versions.get(definition.id)?.at(-1)?.version ?? null;
    if (latest !== previous || version !== (latest ?? 0) + 1) return words.invalid;
    return ruleProblem(definition, actionSchema(ports.registry, definition.action.tool, definition.action.act));
  }
  if (event.kind === "rule-approved" || event.kind === "rule-retired") {
    const expected = event.kind === "rule-approved" ? "approve" : "retire";
    if (option !== expected) return words.invalid;
    if (context.by !== house.admin) return words.only;
    return versionProblem(event.data, { ...ports.state(), house }, ports.registry, expected);
  }
  return effectRefusalTexts.houseFact;
}
