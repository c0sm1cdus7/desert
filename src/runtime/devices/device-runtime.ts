// Administra dispositivos del dueño y conexiones técnicas separadas de las sesiones de identidad.
import { supportsDeviceAction, type DeviceRequest } from "../../fields/device-protocol.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
import type { House } from "../../house/members.ts";
import type { HouseBus } from "../../journal/vocabulary.ts";
import type { Program, ToolRegistry } from "../../tools/tool-contract.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import { deviceDispatcher, type DeviceConnection } from "./device-dispatch.ts";
import { deviceRegistrationAccess } from "./device-registration.ts";
import { deviceConnections, recoverDevices } from "./device-connections.ts";
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
export function createDeviceRuntime<X extends Program>(
  bus: HouseBus,
  state: () => House,
  registry: ToolRegistry<X>,
  host: string,
  scrub: (value: unknown) => unknown,
) {
  const access = runtimeState(state);
  const live = deviceConnections(bus, state, host, access.ready);
  const dispatch = deviceDispatcher(
    bus,
    (request: DeviceRequest) => {
      access.checkOpen();
      const current = live.connections.get(request.device);
      if (!current) return undefined;
      const device = access.ready(request.device);
      return device.connection === current.id && matches(current, request.tool, request.version, request.action)
        ? current
        : undefined;
    },
    scrub,
  );
  recoverDevices(bus, state(), host);
  return {
    dispatch,
    ...deviceRegistrationAccess(bus, state, access.checkOpen),
    authentication: (id: string) => access.ready(id).publicKey,
    connect: live.connect,
    available: availability(state, registry, live.connections),
    close() {
      if (access.close()) live.close();
    },
  };
}
export type DeviceRuntime = ReturnType<typeof createDeviceRuntime>;
