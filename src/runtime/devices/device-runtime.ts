// Runs an owner's devices and their technical connections, apart from identity sessions.
import { supportsDeviceAction, type DeviceRequest } from "../../fields/device-protocol.ts";
import type { House } from "../../house/members.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
import type { HouseBus } from "../../journal/vocabulary.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import type { Program, ToolRegistry } from "../../tools/tool-contract.ts";
import { createDeviceDoor } from "./device-authentication.ts";
import { deviceConnections, recoverDevices } from "./device-connections.ts";
import { deviceDispatcher, type DeviceConnection } from "./device-dispatch.ts";
type DeviceConnections = ReturnType<typeof deviceConnections>;
const matches = (connection: DeviceConnection, tool: string, version: string, action: string) =>
  supportsDeviceAction(connection.endpoint.inventory, tool, version, action);
function availability<X extends Program>(
  state: () => House,
  registry: ToolRegistry<X>,
  connections: ReadonlyMap<string, DeviceConnection>,
) {
  return (program: string, action: string) => {
    const execution = registry.find(each => each.id === program)?.acts[action]?.execution;
    if (!execution || execution.at === "house") return [];
    return [...connections].flatMap(([id, current]) => {
      const device = state().devices.devices.get(id);
      return device &&
        device.connection === current.id &&
        !device.retired &&
        state().grants.has(device.owner) &&
        matches(current, execution.tool, execution.version, action)
        ? [readonlyState(device)]
        : [];
    });
  };
}
function runtimeState(state: () => House) {
  let closed = false;
  const checkOpen = () => {
    if (closed) throw new Error(deviceTexts.closed);
  };
  return {
    checkOpen,
    ready: (id: string) => {
      checkOpen();
      const device = state().devices.devices.get(id);
      if (!device || !device.accepted || device.retired || !state().grants.has(device.owner))
        throw new Error(deviceTexts.unavailable);
      return device;
    },
    close() {
      if (closed) return false;
      closed = true;
      return true;
    },
  };
}
type Access = ReturnType<typeof runtimeState>;
function dispatcher(bus: HouseBus, scrub: (value: unknown) => unknown, access: Access, live: DeviceConnections) {
  return deviceDispatcher({
    bus,
    connection: (request: DeviceRequest) => {
      access.checkOpen();
      const current = live.connections.get(request.device);
      if (!current) return undefined;
      const device = access.ready(request.device);
      return device.connection === current.id && matches(current, request.tool, request.version, request.action)
        ? current
        : undefined;
    },
    scrub,
    resultWritten: request => {
      try {
        live.release(request.device, request.execution);
      } catch {
        // The act already has its answer; a notice left unanswered is sent again by its device.
      }
    },
  });
}
export function createDeviceRuntime<X extends Program>(
  bus: HouseBus,
  state: () => House,
  registry: ToolRegistry<X>,
  host: string,
  scrub: (value: unknown) => unknown,
) {
  const access = runtimeState(state);
  const live = deviceConnections({ bus, state, scrub }, host, access.ready);
  const dispatch = dispatcher(bus, scrub, access, live);
  recoverDevices(bus, state(), host);
  const connection = {
    authentication: (id: string) => access.ready(id).publicKey,
    connect: live.connect,
  };
  return {
    dispatch,
    ...connection,
    door: createDeviceDoor(connection),
    available: availability(state, registry, live.connections),
    close() {
      if (access.close()) live.close();
    },
  };
}
export type DeviceRuntime = ReturnType<typeof createDeviceRuntime>;
