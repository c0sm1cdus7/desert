// Starts the thinking the distribution asks for over the rebuilt journal and stops it with the house.
import type { Text } from "../../fields/phrases.ts";
import { workingLanguage } from "../../fields/languages.ts";
import { randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { effect } from "../../house/facts.ts";
import { mindActor, parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { targetTool } from "../../house/attendance.ts";
import { identityView } from "../../house/members.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import { ownPlanControl } from "../../tools/minds/journey-menu.ts";
import { readonlyPorts } from "../../tools/boundaries/readonly-ports.ts";
import { watchRunning } from "../../tools/execution/running-acts.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
import { runMindTurn } from "./mind-turn.ts";
import { journeyCutScene, withCuts } from "./journey-cut-scene.ts";
import { startMindSchedule, recoverMindSchedule, type MindSchedulePorts } from "./mind-schedule.ts";
import { runtimeView, scopeActive } from "./mind-runtime-view.ts";
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
import { referenceResolver, resolveAnswer } from "./mind-references.ts";
import { activityTarget } from "./mind-read.ts";
import { activityPage, page } from "./mind-frame-focus.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { expandKit } from "../../house/kit-selection.ts";
import { assignDeclaredCards, publishMindCards } from "./mind-card-catalog.ts";
import { definitionOf, definitionsNow, liveDefinitions, supervisorActor } from "./mind-definitions.ts";
import { houseSupervisor } from "./house-supervisor.ts";
import { supervisorTurnFrame } from "./supervisor-turn-frame.ts";
import { recoverVerdictTurns, verdictTurns } from "./supervisor-verdict-turn.ts";
function validateRuntime<X extends Program>(
  house: MindRuntimeHouse<X>,
  switches: MindSwitches,
  options: MindRuntimeOptions,
) {
  requireMind(options.account.trim(), "runtime.account");
  for (const name of ["message", "fingerprint", "rulesVersion", "key", "transport"] as const)
    requireMind(typeof options[name] === "function", `runtime.${name}`);
  requireMind(
    new Set(options.definitions.map(each => each.actor)).size === options.definitions.length,
    "runtime.duplicate",
  );
  for (const definition of options.definitions) requireMind(Value.Check(mindActor, definition.actor), "runtime.actor");
  for (const program of switches.programs) {
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
        const now = house.time.now();
        if (!house.active()) return { menu: [], active: false, through: 0, rulesVersion: options.rulesVersion(), now };
        const { menu, control } = this.view(scope);
        return { menu, active: control.active, through: control.through, rulesVersion: control.rulesVersion, now };
      },
      isOpen: id =>
        house.active() &&
        !!house.execution.state().house.minds.turns.get(id) &&
        !house.execution.state().house.minds.turns.get(id)?.closed,
      allowed: (scope, act) => {
        if (!house.active()) return false;
        const { control, menu } = this.view(scope);
        const offered = menu.some(item => item.act === act.act && item.target === act.target);
        return control.active && (offered || ownPlanControl(scope, control, act));
      },
      supervision: { ...(this.supervisor ? { supervisor: this.supervisor.review } : {}), ...options.supervision },
      emit: this.emit,
      execute: runtimeActions(house, options, switches),
      page: this.page,
      resolve: this.resolve,
    };
  }
  /** The read act: an object whole, or the whole activity, newest first, from a character on. */
  private page: NonNullable<TurnPorts["page"]> = (turn, target, from) => {
    const view = this.view(turn.scope);
    if (target !== activityTarget) {
      const object = view.objects.find(each => each.id === target);
      return object && page(object.text, from);
    }
    return page(
      activityPage(view.activity, item => `${item.id}: ${item.text}`),
      from,
    );
  };
  /** The whole ids behind the short references an answer gives back: events, journeys and objects. */
  private resolve: NonNullable<TurnPorts["resolve"]> = (scope, value) => {
    const { house } = this;
    const view = this.view(scope);
    const known = [
      ...house.history().map(event => event.id),
      ...house.execution.state().house.journeys.keys(),
      ...view.objects.map(object => object.id),
    ];
    return resolveAnswer(value, view.menu, referenceResolver(known));
  };
  private emit: TurnPorts["emit"] = emission => {
    const { house } = this;
    if (!house.active()) return;
    house.execution.bus.emit(emission);
    if (emission.kind !== "mind-scene" || emission.process) return;
    // The consciousness's scene is the mind's house scene, with its cut journeys first until each one goes on.
    const state = house.execution.state().house;
    const general = withCuts(state, emission.by, workingLanguage, emission.data.text);
    const to = state.scenes.get(emission.by)?.data.to ?? {};
    house.execution.bus.emit(effect("scene", { general, to }, emission.by, emission.cause));
  };
  /** The name people see, which a group line names with «@» (22/11): an assistant's given name, a program's name. */
  private visibleName(actor: string, role: string): Text {
    const { house } = this;
    const mind = parseMindActor(actor);
    if (mind?.kind === "assistant") return house.execution.state().house.assistants.get(mind.owner)?.name ?? role;
    return house.execution.registry.find(tool => tool.id === mind?.tool)?.name ?? role;
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
          .filter(scope => recover || scopeActive(house, switches, scope))
          .map(scope => ({
            scope,
            name: this.visibleName(each.actor, each.role),
            message: options.message,
            toolOf: (target: string) =>
              targetTool(house.execution.registry, identityView(house.execution.state(), each.actor), target)?.id,
            talks: house.execution.registry.some(tool => tool.talks === true && each.actor === `mind:${tool.id}`),
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
  /** Every mind thinks through the same turn; the supervisor's turn reads its own frame of the whole house. */
  private async run(ports: TurnPorts, wake: TurnWake) {
    const outcome = await runMindTurn(ports, wake);
    journeyCutScene(this.house, wake, workingLanguage);
    this.options.observeTurn?.(outcome);
    return outcome;
  }
  /** Closes what a restart cut, then lets an identity's marked act, at any door, wait for the supervisor's verdict in
   * a turn of its own (21/11). */
  private recover(schedulePorts: MindSchedulePorts, model: TurnPorts["model"]) {
    const { house, options, supervisor } = this;
    if (supervisor) recoverVerdictTurns(house);
    recoverMindSchedule({ ...schedulePorts, policies: () => this.policies(true) });
    house.supervise?.(supervisor && verdictTurns(house, options, model, supervisor.judged));
  }
  start() {
    const { house, options, switches } = this;
    const model = runtimeModel(house, options);
    const frames = runtimeFrame(house, options, switches, model);
    const ports = this.turnPorts(frames.frame, model.model);
    const supervising = { ...ports, frame: supervisorTurnFrame(house, options, model, scope => this.view(scope)) };
    const schedulePorts: MindSchedulePorts = {
      bus: house.execution.bus,
      history: house.history,
      policies: this.policies,
      time: house.time,
      nextId: randomUUID,
      emit: emission => {
        house.execution.bus.emit(emission);
      },
      run: wake => this.run(wake.scope.actor === supervisorActor ? supervising : ports, wake),
      failed: cause => {
        this.live = false;
        house.failed(new Error(turnNotice.text(workingLanguage, { reason: "internal" }), { cause }));
      },
    };
    this.recover(schedulePorts, model.model);
    const offs = [watchRunning(house.execution), this.assistantCards].map(listen => house.execution.bus.on(listen));
    const schedule = startMindSchedule(schedulePorts);
    return {
      flush: schedule.flush,
      notices: () => programMindNotices(options),
      thread: frames.thread,
      diagnose: frames.diagnose,
      compact: frames.compact,
      close: () => {
        house.supervise?.(undefined);
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
