// Une cartas certificadas, reservas atómicas y liquidaciones del puente al diario vivo de la casa.
import { effect } from "../../house/facts.ts";
import type { MindActor } from "../../fields/mind-actor.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { callAssignedModel, modelCandidates } from "./mind-model-bridge.ts";
import { eligibleMindCards } from "./mind-assignment.ts";
import { budgetTransaction, reserveModelCall, settleModelCall, markUncertainCall } from "./mind-call-budget.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
import type { ModelRequest } from "./mind-ports.ts";
function assignedCard<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  const { execution } = house;
  return (actor: MindActor) => {
    const definition = options.definitions.find(each => each.actor === actor);
    const assigned = execution.state().house.mindAssignments.get(actor);
    if (!definition || !assigned) return undefined;
    const needs = execution.registry
      .filter(tool => actor === `mind:${tool.id}` || definition.communication.some(item => item.tool === tool.id))
      .flatMap(tool => Object.values(tool.acts).flatMap(act => act.needs ?? []));
    const fingerprint = options.fingerprint(definition);
    const eligible = eligibleMindCards(
      modelCandidates(options.catalog),
      definition.role,
      options.providers,
      needs,
      fingerprint,
    );
    if (!eligible.some(each => each.name === assigned.card && each.version === assigned.version)) return undefined;
    const selected = options.catalog.find(each => each.model === assigned.card && each.effort === assigned.version);
    if (!selected || assigned.capabilities.some(need => !selected.capabilities.includes(need))) return undefined;
    return { card: selected, role: definition.role, fingerprint };
  };
}
function openCall<X extends Program>(house: MindRuntimeHouse<X>, request: ModelRequest): boolean {
  if (!house.active()) return false;
  const turn = house.execution.state().house.minds.turns.get(request.turn);
  return !!turn && !turn.closed;
}
function billingFor<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  const { execution } = house;
  const billing = options.billing ?? {
    bus: execution.bus,
    calls: () => execution.state().house.modelCalls,
    active: house.active,
  };
  return billing;
}
function accountPorts<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  const { execution } = house;
  const billing = billingFor(house, options);
  const call = (request: ModelRequest) => `${request.turn}:${request.number}`;
  const process = (request: ModelRequest) => execution.state().house.minds.turns.get(request.turn)?.opened.process;
  const live = (request: ModelRequest) => billing.active() && openCall(house, request);
  return {
    reserve: (request, maximumNanoUsd, cap) => {
      const scope = process(request);
      return !live(request)
        ? Promise.resolve(false)
        : reserveModelCall(budgetTransaction(billing.bus, billing.calls), cap, {
            call: call(request),
            turn: request.turn,
            number: request.number,
            account: options.account,
            maximumNanoUsd,
            by: request.mind,
            ...(scope ? { process: scope } : {}),
          });
    },
    start: request => {
      requireMind(live(request), "runtime.active");
      billing.bus.emit(effect("model-call-started", { call: call(request) }, request.mind, [], process(request)));
      return Promise.resolve();
    },
    settle: (request, usage, cost) => {
      if (billing.active())
        billing.bus.emit(settleModelCall(call(request), cost, usage, request.mind, process(request)));
      return Promise.resolve();
    },
    uncertain: request => {
      if (billing.active()) billing.bus.emit(markUncertainCall(call(request), request.mind, process(request)));
      return Promise.resolve();
    },
  } satisfies Pick<Parameters<typeof callAssignedModel>[0], "reserve" | "start" | "settle" | "uncertain">;
}

export function runtimeModel<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  const card = assignedCard(house, options);
  const model = callAssignedModel({
    ...accountPorts(house, options),
    card,
    key: options.key,
    transport: options.transport,
    capNanoUsd: options.capNanoUsd,
    maxInputTokens: options.maxInputTokens,
  });
  return {
    model: (request: ModelRequest) => {
      const reason = options.unavailable?.get(request.mind);
      return reason === "no-key" || reason === "no-card" || reason === "cap"
        ? Promise.resolve({ kind: "not-sent" as const, reason })
        : model(request);
    },
    card,
  };
}
