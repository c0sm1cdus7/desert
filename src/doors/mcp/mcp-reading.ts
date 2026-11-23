// Every member reads every program; only actions depend on the identity kit.
import { deviceChoices } from "../../house/devices/device-state.ts";
import { stripVTControlCharacters } from "node:util";
import { allowedAct } from "../../house/kit.ts";
import { targetTool } from "../../house/attendance.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import type { Program, ViewLimits, Tool, ToolAct } from "../../tools/tool-contract.ts";
import type { HousePorts } from "../../surface/bridge/ports/house-ports.ts";
import type { ProgramTool } from "../../tools/promises.ts";
import { programOffered } from "../../tools/program-run.ts";
import { isProgram } from "../../tools/execution/program-causes.ts";
import { programCall } from "../../fields/program-call.ts";
import { isRecord } from "../../fields/json-values.ts";
import { noticesOf } from "../../surface/bridge/views/notices.ts";
import { identityReading, identityTarget } from "../../tools/identities/identity-reading.ts";
import type { RequestHouse } from "../socket/requests/request-book.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
import { inLanguage, linesIn, said as inWords, type Text } from "../../fields/phrases.ts";
import { readerLanguage } from "../../house/members.ts";
import type { Language } from "../../fields/languages.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { toolResult } from "./mcp-protocol.ts";
export type McpHouse<X extends Program> = RequestHouse<X> & Parameters<typeof localPorts<X>>[0];
const declared = <X extends Program>(tool: Tool<X>): tool is ProgramTool<X> =>
  Object.values(tool.acts).every(isProgram);
function scene<X extends Program>(ports: HousePorts<X>, identity: string) {
  const reading: unknown = JSON.parse(
    identityReading(ports.state().house, identityTarget(identity), ports.registry, ports.me),
  );
  if (!isRecord(reading)) throw new Error("Invalid identity reading");
  return {
    identity: identity,
    general: reading.general,
    addressed: reading.addressed,
    recipients: ports.state().house.scenes.get(identity)?.data.to,
  };
}
function overview<X extends Program>(ports: HousePorts<X>, tools: readonly Tool<X>[], language: Language) {
  const state = ports.state();
  const notices = tools.filter(declared).map(tool => ({
    program: tool.id,
    ...noticesOf({ ...ports, language, act: value => ports.act(value, state.through) }, tool, {
      name: tool.id,
      titleOf: target => target,
    }).notices(),
  }));
  return {
    identity: ports.me,
    since: state.through,
    scenes: [...state.house.scenes.keys()].map(identity => scene(ports, identity)),
    programs: tools.map(({ id, purpose }) => ({ id, purpose })),
    notices,
  };
}
function actionGroups<X extends Program>(tool: Tool<X>): readonly Tool<X>[] {
  const groups = declared(tool) ? tool.groups : undefined;
  if (!groups) return [tool];
  const names = new Set(groups.flatMap(group => Object.keys(group.tool.acts)));
  const root = Object.fromEntries(Object.entries(tool.acts).filter(([name]) => !names.has(name)));
  return [...(Object.keys(root).length ? [{ ...tool, acts: root }] : []), ...groups.map(group => group.tool)];
}
function choiceSources(input: unknown): string[] {
  if (Array.isArray(input)) return input.flatMap(choiceSources);
  if (!isRecord(input)) return [];
  return [...(typeof input.of === "string" ? [input.of] : []), ...Object.values(input).flatMap(choiceSources)];
}
function dynamicChoices<X extends Program>(ports: HousePorts<X>, act: ToolAct<X>, target?: string) {
  if (!isProgram(act) || !act.choices || target === undefined) return {};
  return {
    choices: Object.fromEntries(
      [...new Set(choiceSources(act.input))].map(source => [
        source,
        programCall(act.choices?.bind(act), source, ports.state(), target) ?? [],
      ]),
    ),
  };
}
function actions<X extends Program>(ports: HousePorts<X>, tools: readonly Tool<X>[], on?: string) {
  const state = ports.state();
  return tools.flatMap(tool => {
    const reason = (name: string, act: ToolAct<X>, target?: string): Text | undefined => {
      if (!allowedAct(state.house, ports.me, tool.id, name)) return toolTexts.kitRefusal(tool.id);
      return target === undefined ? mcpTexts.noThings : programOffered(act, state, target, ports.now());
    };
    const groups = declared(tool) ? tool.groups : undefined;
    return actionGroups(tool).flatMap(group =>
      Object.entries(group.acts)
        .filter(([name]) => groups !== undefined || allowedAct(state.house, ports.me, tool.id, name))
        .flatMap(([name, act]) => {
          const targets = act.on === "thing" ? programCall(group.targets.bind(group), state) : [group.id];
          return (targets.length ? targets : [undefined])
            .filter(target => on === undefined || target === on)
            .map(target => ({
              program: tool.id,
              tool: group.id,
              action: name,
              name: isProgram(act) ? act.name : name,
              subject: act.on ?? "tool",
              target,
              purpose: isProgram(act) ? act.purpose : tool.purpose,
              input: act.input,
              ...dynamicChoices(ports, act, target),
              ...(act.execution
                ? {
                    execution: act.execution,
                    destinations: [
                      ...(act.execution.at !== "device" ? [{ kind: "house" }] : []),
                      ...deviceChoices(state.house, act.execution, name),
                    ],
                  }
                : {}),
              reason: reason(name, act, target),
            }));
        }),
    );
  });
}
export function mcpReading<X extends Program>(house: McpHouse<X>, by: string, limits: Omit<ViewLimits, "now">) {
  const ports = localPorts(house, by, limits);
  const tools = () => ports.registry;
  /** Whoever is connected reads every word in the language its identity reads the house in. */
  const language = (): Language => readerLanguage(ports.state().house, by);
  const said = (text: Text): string => inWords(text, language());
  const clean = (value: unknown) =>
    stripVTControlCharacters(
      house.tools.prepare(
        typeof value === "string" ? linesIn(value, language()) : JSON.stringify(inLanguage(value, language())),
      ),
    );
  const readable = tools;
  const matches = (id: string, target: string) => targetTool(ports.registry, ports.state(), target)?.id === id;
  const read = (id?: string, target?: string) => {
    if (id !== undefined && target !== undefined && !matches(id, target))
      return toolResult(said(mcpTexts.action), true);
    const tool = readable().find(tool => tool.id === id);
    if (id !== undefined)
      return tool
        ? toolResult(
            clean(programCall(tool.view.bind(tool), ports.state(), target ?? id, { ...limits, now: ports.now() })),
          )
        : toolResult(said(mcpTexts.tool), true);
    return toolResult(clean(overview(ports, tools(), language())));
  };
  const offered = (id?: string, target?: string) => {
    if (id !== undefined && target !== undefined && !matches(id, target))
      return toolResult(said(mcpTexts.action), true);
    if (id !== undefined && !readable().some(tool => tool.id === id)) return toolResult(said(mcpTexts.tool), true);
    const shown = readable().filter(tool => id === undefined || id === tool.id);
    return toolResult(clean(actions(ports, shown, target)));
  };
  return { read, actions: offered };
}
