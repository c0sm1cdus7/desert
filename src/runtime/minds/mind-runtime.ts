// Enciende el pensamiento pedido por la distribución sobre el diario reconstruido y lo apaga con la casa.
import { randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { effect } from "../../house/facts.ts";
import { mindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { targetTool } from "../../house/attendance.ts";
import { identityView } from "../../house/members.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import { actReach } from "../../tools/execute.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import { readonlyPorts } from "../../tools/boundaries/readonly-ports.ts";
import { watchRunning } from "../../tools/execution/running-acts.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
import { runMindTurn } from "./mind-turn.ts";
import { followUpJourney } from "./journey-follow-up.ts";
import { startMindSchedule, recoverMindSchedule, type MindSchedulePorts } from "./mind-schedule.ts";
import { runtimeView } from "./mind-runtime-view.ts";
import { runtimeFrame } from "./mind-runtime-frame.ts";
import { programMindNotices } from "./program-mind-availability.ts";
import { runtimeModel } from "./mind-runtime-model.ts";
import { runtimeActions } from "./mind-runtime-actions.ts";
import {
  enabledMind,
  type MindRuntimeHouse,
  type MindRuntimeOptions,
  type MindSwitches,
} from "./mind-runtime-options.ts";
import type { TurnPorts, TurnWake } from "./mind-ports.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { expandKit } from "../../house/kit-selection.ts";
import { assignDeclaredCards, publishMindCards } from "./mind-card-catalog.ts";
import { definitionOf, definitionsNow, liveDefinitions, supervisorActor } from "./mind-definitions.ts";
import { houseSupervisor } from "./house-supervisor.ts";
function validateRuntime<X extends Program>(
  house: MindRuntimeHouse<X>,
  switches: MindSwitches,
  options: MindRuntimeOptions,
) {
  requireMind(options.language, "runtime.language");
  requireMind(options.account.trim(), "runtime.account");
  for (const name of ["message", "fingerprint", "rulesVersion", "key", "transport"] as const)
    requireMind(typeof options[name] === "function", `runtime.${name}`);
  requireMind(
    new Set(options.definitions.map(each => each.actor)).size === options.definitions.length,
    "runtime.duplicate",
  );
  for (const definition of options.definitions) requireMind(Value.Check(mindActor, definition.actor), "runtime.actor");
  for (const program of switches.programas) {
    requireMind(house.execution.registry.find(tool => tool.id === program)?.skill?.kind === "skill", "runtime.skill");
    requireMind(
      options.definitions.some(each => each.actor === `mind:${program}`),
      "runtime.definition",
    );
  }
  const reserved = house.execution.registry.some(tool => `mind:${tool.id}` === supervisorActor);
  requireMind(!options.supervisorCard || !reserved, "runtime.supervisor");
}
class HouseMindRuntime<X extends Program> {
  private live = true;
  readonly house: MindRuntimeHouse<X>;
  readonly options: MindRuntimeOptions;
  readonly switches: MindSwitches;
  readonly supervisor: ReturnType<typeof houseSupervisor<X>>;
  constructor(supplied: MindRuntimeHouse<X>, switches: MindSwitches, options: MindRuntimeOptions) {
    validateRuntime(supplied, switches, options);
    this.options = options;
    this.switches = switches;
    this.house = {
      ...supplied,
      active: () => this.live && supplied.active(),
      execution: {
        ...readonlyPorts(supplied.execution),
        live: () => this.live && supplied.active(),
        running: new Map(),
      },
    };
    this.supervisor = houseSupervisor(this.house, options);
  }
  view = (scope: MindScope) => {
    const found = definitionOf(this.options, this.house.execution.state().house, scope.actor);
    requireMind(found, "runtime.definition");
    return runtimeView(this.house, this.options, this.switches, scope, found);
  };
  private turnPorts(frame: TurnPorts["frame"], model: TurnPorts["model"]): TurnPorts {
    const { house, options, switches } = this;
    return {
      frame,
      model,
      read: scope => {
        if (!house.active()) return { menu: [], active: false, through: 0, rulesVersion: options.rulesVersion() };
        const { menu, control } = this.view(scope);
        return { menu, active: control.active, through: control.through, rulesVersion: control.rulesVersion };
      },
      isOpen: id =>
        house.active() &&
        !!house.execution.state().house.minds.turns.get(id) &&
        !house.execution.state().house.minds.turns.get(id)?.closed,
      allowed: (scope, act) =>
        house.active() &&
        this.view(scope).control.active &&
        this.view(scope).menu.some(item => item.act === act.act && item.target === act.target),
      reviewReason: (scope, proposal) => this.reviewReason(scope, proposal),
      supervision: { ...(this.supervisor ? { supervisor: this.supervisor.review } : {}), ...options.supervision },
      emit: this.emit,
      execute: runtimeActions(house, options, switches),
    };
  }
  private emit: TurnPorts["emit"] = emission => {
    const { house } = this;
    if (!house.active()) return;
    house.execution.bus.emit(emission);
    if (emission.kind === "mind-scene" && !emission.process)
      house.execution.bus.emit(
        effect(
          "scene",
          { general: emission.data.text, to: house.execution.state().house.scenes.get(emission.by)?.data.to ?? {} },
          emission.by,
          emission.cause,
        ),
      );
  };
  private reviewReason(scope: MindScope, proposal: ProposedAct): ReturnType<TurnPorts["reviewReason"]> {
    const item = this.view(scope).menu.find(each => each.act === proposal.act && each.target === proposal.target);
    if (!item) return undefined;
    if (item.scope === "open") return "open";
    if (item.scope === "control" && (item.act === "end" || item.act === "desist")) return item.act;
    return actReach(this.house.execution, scope.actor, proposal.target, proposal.act) === "world" ? "world" : undefined;
  }
  private policies = (recover = false) => {
    const { house, options, switches } = this;
    const minds = definitionsNow(options, house.execution.state().house)
      .filter(each => enabledMind(switches, each.actor))
      .flatMap(each => {
        const scopes: MindScope[] = [{ kind: "consciousness", actor: each.actor }];
        for (const journey of house.execution.state().house.journeys.values())
          if (journey.by === each.actor && (recover || !journey.closed))
            scopes.push({
              kind: "journey",
              actor: each.actor,
              process: journey.id,
              kit: (journey.selections ? expandKit(journey.selections, house.execution.registry) : journey.kit).map(
                item => ({ tool: item.tool, acts: [...item.acts] }),
              ),
            });
        return scopes
          .filter(scope => recover || this.view(scope).control.active)
          .map(scope => ({
            scope,
            name: house.execution.state().house.assistants.get(each.actor.slice(10))?.name ?? each.role,
            message: options.message,
            toolOf: (target: string) =>
              targetTool(house.execution.registry, identityView(house.execution.state(), each.actor), target)?.id,
          }));
      });
    return this.supervisor && house.active() ? [...minds, this.supervisor.policy(options.message)] : minds;
  };
  /** An assistant enabled while the house runs gets its card choices and, without a card, the default one. */
  private assistantCards = (event: Event) => {
    if (event.layer !== "house" || event.kind !== "assistant-enabled") return;
    const confirmed = this.house.execution.bus.confirmation();
    queueMicrotask(() => {
      if (!confirmed() || !this.house.active()) return;
      const actor = `assistant:${event.data.owner}`;
      const minds = liveDefinitions(this.options, this.house.execution.state().house, this.switches).filter(
        each => each.actor === actor,
      );
      publishMindCards(this.house, this.options, minds);
      assignDeclaredCards(this.house, this.options, minds);
    });
  };
  private async run(ports: TurnPorts, wake: TurnWake) {
    if (wake.scope.actor === supervisorActor && this.supervisor) {
      const learned = await this.supervisor.learn(wake, ports);
      this.options.observeTurn?.(learned);
      return learned;
    }
    const outcome = await runMindTurn(ports, wake);
    followUpJourney(this.house, wake, outcome);
    this.options.observeTurn?.(outcome);
    return outcome;
  }
  start() {
    const { house, options, switches } = this;
    const model = runtimeModel(house, options);
    const frames = runtimeFrame(house, options, switches, model);
    const ports = this.turnPorts(frames.frame, model.model);
    const schedulePorts: MindSchedulePorts = {
      bus: house.execution.bus,
      history: house.history,
      policies: this.policies,
      language: options.language,
      time: house.time,
      nextId: randomUUID,
      emit: emission => {
        house.execution.bus.emit(emission);
      },
      run: wake => this.run(ports, wake),
      failed: cause => {
        this.live = false;
        house.failed(new Error(turnNotice.text(options.language, { reason: "internal" }), { cause }));
      },
    };
    recoverMindSchedule({ ...schedulePorts, policies: () => this.policies(true) });
    const offs = [watchRunning(house.execution), this.assistantCards].map(listen => house.execution.bus.on(listen));
    const schedule = startMindSchedule(schedulePorts);
    return {
      flush: schedule.flush,
      notices: () => programMindNotices(options),
      thread: frames.thread,
      diagnose: frames.diagnose,
      compact: frames.compact,
      close: () => {
        this.live = false;
        schedule.close();
        offs.forEach(off => off());
        for (const act of house.execution.running?.values() ?? []) act.controller.abort();
      },
    };
  }
}
export function startModelMinds<X extends Program>(
  house: MindRuntimeHouse<X>,
  switches: MindSwitches,
  options: MindRuntimeOptions,
) {
  return new HouseMindRuntime(house, switches, options).start();
}
export type ModelMinds = ReturnType<typeof startModelMinds>;
