// Ejecuta acciones instaladas y devuelve recibos; no interpreta encargos ni crea journeys.
import { Value } from "@sinclair/typebox/value";
import { readonlyState } from "../../journal/readonly-state.ts";
import {
  deviceRequest,
  deviceResult,
  type DeviceRequest,
  type DeviceResult,
  type DeviceEndpoint,
} from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
export type InstalledDeviceTool = Readonly<{
  tool: string;
  version: string;
  actions: Readonly<Record<string, (request: DeviceRequest) => Promise<DeviceResult>>>;
}>;
export function createDeviceProcess(installed: readonly InstalledDeviceTool[]): DeviceEndpoint {
  const tools = installed.map(each => ({ ...each, actions: { ...each.actions } }));
  if (new Set(tools.map(each => each.tool)).size !== tools.length) throw new Error(deviceTexts.invalid);
  const received = new Set<string>();
  return {
    inventory: tools.map(each => ({ tool: each.tool, version: each.version, actions: Object.keys(each.actions) })),
    async receive(request) {
      if (!Value.Check(deviceRequest, request)) throw new Error(deviceTexts.invalid);
      const tool = tools.find(each => each.tool === request.tool && each.version === request.version);
      const run = tool && Object.hasOwn(tool.actions, request.action) ? tool.actions[request.action] : undefined;
      if (!run) throw new Error(deviceTexts.incompatible);
      if (received.has(request.execution)) throw new Error(deviceTexts.duplicate);
      received.add(request.execution);
      const result = await run(readonlyState(structuredClone(request)));
      if (!Value.Check(deviceResult, result)) throw new Error(deviceTexts.failed);
      return structuredClone(result);
    },
  };
}
