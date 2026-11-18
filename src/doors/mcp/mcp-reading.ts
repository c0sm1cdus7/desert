// La puerta agente lee programas, carpetas y objetos como la terminal, con acciones sujetas al kit.
import { stripVTControlCharacters } from "node:util";
import { allowed, allowedAct } from "../../house/kit.ts";
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
import { mcpTexts as said } from "../../texts/mcp.texts.ts";
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
  return { identidad: identity, general: reading.general, parte: reading.addressed };
}
function overview<X extends Program>(ports: HousePorts<X>, tools: readonly Tool<X>[]) {
  const state = ports.state();
  const avisos = tools.filter(declared).map(tool => ({
    programa: tool.id,
    ...noticesOf({ ...ports, act: value => ports.act(value, state.through) }, tool, {
      name: tool.id,
      titleOf: target => target,
    }).notices(),
  }));
  return {
    identidad: ports.me,
    desde: state.through,
    escenas: [...state.house.scenes.keys()].map(identity => scene(ports, identity)),
    programas: tools.map(({ id, purpose }) => ({ id, para: purpose })),
    avisos,
  };
}
function actions<X extends Program>(ports: HousePorts<X>, tools: readonly Tool<X>[], on?: string) {
  const state = ports.state();
  return tools.flatMap(tool => {
    const reason = (name: string, act: ToolAct<X>, target?: string) => {
      if (!allowedAct(state.house, ports.me, tool.id, name)) return toolTexts.kitRefusal(tool.id);
      return target === undefined ? said.noThings : programOffered(act, state, target, ports.now());
    };
    const groups = declared(tool) ? tool.groups : undefined;
    const members: readonly Tool<X>[] = groups?.map(group => group.tool) ?? [tool];
    return members.flatMap(group =>
      Object.entries(group.acts)
        .filter(([name]) => groups !== undefined || allowedAct(state.house, ports.me, tool.id, name))
        .flatMap(([name, act]) => {
          const targets = act.on === "thing" ? programCall(group.targets.bind(group), state) : [group.id];
          return (targets.length ? targets : [undefined])
            .filter(target => on === undefined || target === on)
            .map(target => ({
              programa: tool.id,
              herramienta: group.id,
              accion: name,
              nombre: isProgram(act) ? act.name : name,
              sobre: act.on ?? "tool",
              objetivo: target,
              para: isProgram(act) ? act.purpose : tool.purpose,
              entrada: act.input,
              motivo: reason(name, act, target),
            }));
        }),
    );
  });
}
export function mcpReading<X extends Program>(house: McpHouse<X>, by: string, limits: Omit<ViewLimits, "now">) {
  const ports = localPorts(house, by, limits);
  const tools = () =>
    ports.registry.filter(
      tool =>
        allowed(ports.state().house, by, tool.id) ||
        (tool.id === "identities" && allowedAct(ports.state().house, by, tool.id, "scene")),
    );
  const clean = (value: unknown) =>
    stripVTControlCharacters(house.tools.prepare(typeof value === "string" ? value : JSON.stringify(value)));
  const readable = () =>
    ports.registry.filter(tool => (declared(tool) && tool.groups !== undefined) || tools().includes(tool));
  const matches = (id: string, target: string) => targetTool(ports.registry, ports.state(), target)?.id === id;
  const read = (id?: string, target?: string) => {
    if (id !== undefined && target !== undefined && !matches(id, target)) return toolResult(said.action, true);
    const tool = readable().find(tool => tool.id === id);
    if (id !== undefined)
      return tool
        ? toolResult(
            clean(programCall(tool.view.bind(tool), ports.state(), target ?? id, { ...limits, now: ports.now() })),
          )
        : toolResult(said.tool, true);
    return toolResult(clean(overview(ports, tools())));
  };
  const offered = (id?: string, target?: string) => {
    if (id !== undefined && target !== undefined && !matches(id, target)) return toolResult(said.action, true);
    if (id !== undefined && !readable().some(tool => tool.id === id)) return toolResult(said.tool, true);
    return toolResult(
      clean(
        actions(
          ports,
          readable().filter(tool => id === undefined || id === tool.id),
          target,
        ),
      ),
    );
  };
  return { read, actions: offered };
}
