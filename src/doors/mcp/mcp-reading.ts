// La puerta agente lee los puertos y avisos de la terminal, y ofrece solo las acciones de su kit.
import { stripVTControlCharacters } from "node:util";
import { allowed, allowedAct } from "../../house/kit.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import type { Program, ViewLimits, Tool } from "../../tools/tool-contract.ts";
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
    herramienta: tool.id,
    ...noticesOf({ ...ports, act: value => ports.act(value, state.through) }, tool, {
      name: tool.id,
      titleOf: target => target,
    }).notices(),
  }));
  return {
    identidad: ports.me,
    desde: state.through,
    escenas: [...state.house.scenes.keys()].map(identity => scene(ports, identity)),
    herramientas: tools.map(({ id, purpose }) => ({ id, para: purpose })),
    avisos,
  };
}
function actions<X extends Program>(ports: HousePorts<X>, tools: readonly Tool<X>[]) {
  const state = ports.state();
  return tools.flatMap(tool =>
    Object.entries(tool.acts)
      .filter(([name]) => allowedAct(state.house, ports.me, tool.id, name))
      .flatMap(([name, act]) => {
        const targets = act.on === "thing" ? programCall(tool.targets.bind(tool), state) : [tool.id];
        return (targets.length ? targets : [undefined]).map(target => ({
          herramienta: tool.id,
          accion: name,
          nombre: isProgram(act) ? act.name : name,
          sobre: act.on ?? "tool",
          objetivo: target,
          para: isProgram(act) ? act.purpose : tool.purpose,
          entrada: act.input,
          motivo: target === undefined ? said.noThings : programOffered(act, state, target, ports.now()),
        }));
      }),
  );
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
  const read = (id?: string) => {
    const tool = tools().find(tool => tool.id === id);
    if (id !== undefined)
      return tool
        ? toolResult(clean(programCall(tool.view.bind(tool), ports.state(), id, { ...limits, now: ports.now() })))
        : toolResult(said.tool, true);
    return toolResult(clean(overview(ports, tools())));
  };
  const offered = (id?: string) => {
    if (id !== undefined && !tools().some(tool => tool.id === id)) return toolResult(said.tool, true);
    return toolResult(
      clean(
        actions(
          ports,
          tools().filter(tool => id === undefined || id === tool.id),
        ),
      ),
    );
  };
  return { read, actions: offered };
}
