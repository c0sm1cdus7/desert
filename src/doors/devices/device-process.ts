// Runs installed actions and returns receipts, and joins the tools' notices; it reads no request and opens no journey.
import { Value } from "@sinclair/typebox/value";
import { readonlyState } from "../../journal/readonly-state.ts";
import {
  deviceNotice,
  deviceRequest,
  deviceResult,
  type DeviceRequest,
  type DeviceResult,
  type DeviceEndpoint,
  type DeviceNotice,
  type DeviceNotices,
} from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
export type InstalledDeviceTool = Readonly<{
  tool: string;
  version: string;
  actions: Readonly<Record<string, (request: DeviceRequest) => Promise<DeviceResult>>>;
  /** A tool whose actions announce keeps its notices on disk until the house answers each one. */
  notices?: DeviceNotices;
}>;
/** One outbox for every tool that announces. Which tool owns a notice is learned again from each read and each push,
 * so an acknowledgement reaches its tool after a device restart too. */
function joinedNotices(tools: readonly InstalledDeviceTool[]): DeviceNotices | undefined {
  const ports = tools.flatMap(each => (each.notices ? [each.notices] : []));
  if (ports.length === 0) return undefined;
  const owners = new Map<string, DeviceNotices>();
  const own = (port: DeviceNotices, notice: unknown): DeviceNotice => {
    if (!Value.Check(deviceNotice, notice)) throw new Error(deviceTexts.invalid);
    owners.set(notice.execution, port);
    return structuredClone(notice);
  };
  return {
    async pending() {
      const all: DeviceNotice[] = [];
      for (const port of ports) for (const notice of await port.pending()) all.push(own(port, notice));
      return all;
    },
    async acknowledge(execution, answer) {
      const port = owners.get(execution);
      if (!port) throw new Error(deviceTexts.invalid);
      await port.acknowledge(execution, answer);
      owners.delete(execution);
    },
    subscribe(send) {
      const stops = ports.map(port => port.subscribe(notice => send(own(port, notice))));
      return () => stops.forEach(stop => stop());
    },
  };
}
export function createDeviceProcess(installed: readonly InstalledDeviceTool[]): DeviceEndpoint {
  const tools = installed.map(each => ({ ...each, actions: { ...each.actions } }));
  if (new Set(tools.map(each => each.tool)).size !== tools.length) throw new Error(deviceTexts.invalid);
  const received = new Set<string>();
  const notices = joinedNotices(tools);
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
    ...(notices ? { notices } : {}),
  };
}
