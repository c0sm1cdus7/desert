// Runs installed actions and returns receipts, and joins the tools' notices; it reads no request and opens no journey.
import { meant } from "../../fields/phrases.ts";
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
  type EndpointNotices,
} from "../../fields/device-protocol.ts";
import { isRecord } from "../../fields/json-values.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
export type InstalledDeviceTool = Readonly<{
  tool: string;
  version: string;
  actions: Readonly<Record<string, (request: DeviceRequest) => Promise<DeviceResult>>>;
  /** A tool whose actions announce keeps its notices on disk until the house answers each one. */
  notices?: DeviceNotices;
}>;
/** One outbox for every tool that announces. Which tool owns a notice is learned again from each read and each push,
 * so an acknowledgement reaches its tool after a device restart too. A notice that is not valid is told and left out,
 * alone: it stays owed in its tool, and the next connection tells it again. */
function joinedNotices(tools: readonly InstalledDeviceTool[]): EndpointNotices | undefined {
  const ports = tools.flatMap(each => (each.notices ? [{ tool: each.tool, port: each.notices }] : []));
  if (ports.length === 0) return undefined;
  const owners = new Map<string, DeviceNotices>();
  const own = ({ tool, port }: (typeof ports)[number], notice: unknown, tell: (reason: string) => void) => {
    if (!Value.Check(deviceNotice, notice)) {
      tell(meant(deviceTexts.noticeInvalid(tool, String(isRecord(notice) ? notice.execution : notice).slice(0, 200))));
      return [];
    }
    owners.set(notice.execution, port);
    return [structuredClone(notice)];
  };
  return {
    async pending(tell) {
      const all: DeviceNotice[] = [];
      for (const each of ports) for (const notice of await each.port.pending()) all.push(...own(each, notice, tell));
      return all;
    },
    async acknowledge(execution, answer) {
      const port = owners.get(execution);
      if (!port) throw new Error(meant(deviceTexts.invalid));
      await port.acknowledge(execution, answer);
      owners.delete(execution);
    },
    subscribe(send, tell) {
      const stops = ports.map(each => each.port.subscribe(notice => own(each, notice, tell).forEach(send)));
      return () => stops.forEach(stop => stop());
    },
  };
}
export function createDeviceProcess(installed: readonly InstalledDeviceTool[]): DeviceEndpoint {
  const tools = installed.map(each => ({ ...each, actions: { ...each.actions } }));
  if (new Set(tools.map(each => each.tool)).size !== tools.length) throw new Error(meant(deviceTexts.invalid));
  const received = new Set<string>();
  const notices = joinedNotices(tools);
  return {
    inventory: tools.map(each => ({ tool: each.tool, version: each.version, actions: Object.keys(each.actions) })),
    async receive(request) {
      if (!Value.Check(deviceRequest, request)) throw new Error(meant(deviceTexts.invalid));
      const tool = tools.find(each => each.tool === request.tool && each.version === request.version);
      const run = tool && Object.hasOwn(tool.actions, request.action) ? tool.actions[request.action] : undefined;
      if (!run) throw new Error(meant(deviceTexts.incompatible));
      if (received.has(request.execution)) throw new Error(meant(deviceTexts.duplicate));
      received.add(request.execution);
      const result = await run(readonlyState(structuredClone(request)));
      if (!Value.Check(deviceResult, result)) throw new Error(meant(deviceTexts.failed));
      return structuredClone(result);
    },
    ...(notices ? { notices } : {}),
  };
}
