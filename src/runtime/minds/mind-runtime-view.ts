// Proyecta destinos, permisos y datos visibles de la casa para cada alcance del pensamiento.
import { deviceChoices } from "../../house/devices/device-state.ts";
import type { ExecutionDestination } from "../../fields/device-protocol.ts";
import { programCommunication } from "./program-mind-communication.ts";
import { allowedAct, present } from "../../house/kit.ts";
import { identityView } from "../../house/members.ts";
import { targetTool } from "../../house/attendance.ts";
import { journeyMenu } from "../../tools/minds/journey-menu.ts";
import type { JourneyControlState } from "../../tools/minds/journey-controls.ts";
import type { MindDefinition, MindScope } from "../../tools/minds/mind-contract.ts";
import type { MindMenu } from "../../tools/minds/mind-answer.ts";
import { programOffered } from "../../tools/program-run.ts";
import type { Program, Tool, State, ToolRegistry } from "../../tools/tool-contract.ts";
import type { MindRuntimeHouse, MindRuntimeOptions, MindSwitches } from "./mind-runtime-options.ts";
import { enabledMind } from "./mind-runtime-options.ts";
import type { FrameSource } from "./mind-frame.ts";
export function runtimeView<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  switches: MindSwitches,
  scope: MindScope,
  definition: MindDefinition,
) {
  const { execution } = house;
  const state = identityView(execution.state(), scope.actor);
  const registry = execution.registry;
  const active =
    house.active() &&
    enabledMind(switches, scope.actor) &&
    present(registry, state.house, scope.actor) &&
    (scope.kind !== "journey" ||
      (!!state.house.journeys.get(scope.process) && !state.house.journeys.get(scope.process)?.closed));
  const kit = registry.flatMap(tool => {
    const acts = Object.keys(tool.acts).filter(act => allowedAct(state.house, scope.actor, tool.id, act, registry));
    return acts.length ? [{ tool: tool.id, acts }] : [];
  });
  const parts = visibleTools(house, scope, state, kit);
  const control = controlFor(house, options, state, active, kit);
  const menu = [
    ...journeyMenu(
      scope,
      { ...control, menu: parts.available, communication: definition.communication },
      options.language,
    ),
    ...(active ? programCommunication(scope, definition, options, state) : []),
  ];
  const activity = visibleActivity(house, options, scope, state, kit);
  return { control, menu, ...parts, activity, state };
}

function controlFor<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  state: State<X>,
  active: boolean,
  kit: JourneyControlState["kit"],
): JourneyControlState {
  return {
    active,
    kit,
    journeys: state.house.journeys,
    ...(state.house.kitLayout ? { layout: state.house.kitLayout } : {}),
    ...(state.house.kitMigration ? { migration: state.house.kitMigration } : {}),
    pending: [...state.processing.values()],
    through: state.through,
    now: house.time.now(),
    rulesVersion: options.rulesVersion(),
  };
}

function visibleActivity<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  scope: MindScope,
  state: State<X>,
  kit: JourneyControlState["kit"],
) {
  const registry = house.execution.registry;
  return house.history().flatMap(event => {
    const message = options.message(event);
    if (message && (!message.to || message.to === scope.actor)) return [{ id: event.id, text: message.text }];
    if (event.layer !== "house" || event.kind !== "tool-entry") return [];
    const tool = targetTool(registry, state, event.data.target)?.id ?? event.data.tool;
    return scope.actor === `mind:${tool}` || kit.some(item => item.tool === tool)
      ? [{ id: event.id, text: event.data.text, covered: true }]
      : [];
  });
}
function toolMenu<X extends Program>(
  tool: Tool<X>,
  target: string,
  state: State<X>,
  registry: ToolRegistry<X>,
  now: number,
): MindMenu {
  return Object.entries(tool.acts).flatMap(([act, value]) => {
    if (!allowedAct(state.house, state.by, tool.id, act, registry)) return [];
    if (value.on && (value.on === "tool") !== (target === tool.id)) return [];
    if (programOffered(value, state, target, now) !== undefined) return [];
    const destinations: readonly ExecutionDestination[] | undefined =
      value.execution && value.execution.at !== "house"
        ? [
            ...(value.execution.at === "either" ? [{ kind: "house" as const }] : []),
            ...deviceChoices(state.house, value.execution, act).map(({ kind, device }) => ({ kind, device })),
          ]
        : undefined;
    if (destinations?.length === 0) return [];
    return [
      {
        tool: tool.id,
        act,
        target,
        input: value.input,
        scope: "work" as const,
        ...(destinations ? { destinations } : {}),
      },
    ];
  });
}
function visibleTools<X extends Program>(
  house: MindRuntimeHouse<X>,
  scope: MindScope,
  state: State<X>,
  kit: JourneyControlState["kit"],
) {
  const available: MindMenu[number][] = [];
  const objects: FrameSource["objects"][number][] = [];
  const skills: FrameSource["skills"][number][] = [];
  for (const tool of house.execution.registry) {
    const ownProgram = scope.actor === `mind:${tool.id}`;
    if (tool.skill && (ownProgram || kit.some(item => item.tool === tool.id)))
      skills.push({ id: tool.id, skill: tool.skill });
    if (!ownProgram && !kit.some(item => item.tool === tool.id)) continue;
    for (const target of new Set([tool.id, ...tool.targets(state)])) {
      objects.push({ id: target, text: tool.view(state, target, { recentLines: 30, now: house.time.now() }) });
      available.push(...toolMenu(tool, target, state, house.execution.registry, house.time.now()));
    }
  }
  return { available, objects, skills };
}
