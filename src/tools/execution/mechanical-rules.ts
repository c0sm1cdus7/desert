// Controla reglas vigentes para todo actor y deja resultados durables antes de habilitar el acto.
import { MechanicalRuleFailure } from "../rules/rule-failure.ts";
import type { TSchema } from "@sinclair/typebox";
import { effect, type HouseEvent, type HouseEmission } from "../../house/facts.ts";
import { activeRules } from "../../house/rules/rule-state.ts";
import { ruleProblem, evaluatePredicate } from "../../house/rules/rule-predicate.ts";
import { rulesTexts as words } from "../../texts/rules.texts.ts";
import type { Execution, Decision } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
export function mechanicalRules<X extends Program>(
  ports: Pick<Execution<X>, "state" | "now" | "bus">,
  origin: Pick<HouseEvent<"act">, "id" | "by" | "process">,
  action: Readonly<{ tool: string; act: string }>,
  schema: TSchema,
  input: unknown,
): Decision<X> | undefined {
  const house = ports.state().house;
  const relevant = activeRules(house.rules).filter(
    ({ definition }) => definition.action.tool === action.tool && definition.action.act === action.act,
  );
  if (!relevant.length) return undefined;
  const context = {
    input,
    actor: origin.by,
    admin: house.admin,
    now: ports.now(),
    inJourney: origin.process !== undefined && house.journeys.has(origin.process),
  };
  const results = relevant.map(({ definition, version }) => {
    let outcome: "frena" | "requiere-supervisor" | "passed" = "passed";
    if (ruleProblem(definition, schema)) outcome = "frena";
    else if (evaluatePredicate(definition.condition, context)) outcome = definition.effect;
    return { id: definition.id, version, outcome };
  });
  ports.bus.emit(effect("rule-evaluated", { action, results }, origin.by, [origin.id], origin.process));
  return stoppedDecision<X>(origin.by, action.tool, results);
}
function stoppedDecision<X extends Program>(
  by: string,
  tool: string,
  results: HouseEvent<"rule-evaluated">["data"]["results"],
): Decision<X> | undefined {
  const blocked = results.some(result => result.outcome === "frena");
  const waiting = results.some(result => result.outcome === "requiere-supervisor");
  if (!blocked && !waiting) return undefined;
  const reason = blocked ? words.blocked : words.waiting;
  return {
    status: "rejected",
    coreFailure: "forbidden",
    reason,
    effects: [
      effect("tool-entry", { tool, target: tool, author: by, text: reason, attention: true, detail: results }, by),
    ],
  };
}

export function enforceMechanical<X extends Program>(
  ports: Execution<X>,
  origin: HouseEvent<"act">,
  tool: string,
  schema: TSchema,
): void {
  const result = mechanicalRules(ports, origin, { tool, act: origin.data.option }, schema, origin.data.input);
  if (result)
    throw new MechanicalRuleFailure(
      result.reason ?? words.blocked,
      result.effects.filter((event): event is HouseEmission => event.layer === "house"),
    );
}
