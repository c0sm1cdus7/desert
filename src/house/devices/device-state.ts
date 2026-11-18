// Reconstruye dueños, inventarios y resultados sin convertir dispositivos en actores.
import { supportsDeviceAction, type ActionExecution, type DeviceInstallation } from "../../fields/device-protocol.ts";
import type { HouseEvent } from "../facts.ts";
import type { House } from "../members.ts";
export type Device = Readonly<{
  id: string;
  owner: string;
  name: string;
  publicKey: string;
  accepted: boolean;
  retired: boolean;
  connection?: string;
  inventory: readonly DeviceInstallation[];
}>;
export type DeviceExecution = HouseEvent<"device-execution-started">["data"] &
  Readonly<{
    status: "running" | "unknown" | "accepted" | "rejected";
    reference?: string;
    reason?: string;
  }>;
export type DeviceState = Readonly<{
  devices: ReadonlyMap<string, Device>;
  executions: ReadonlyMap<string, DeviceExecution>;
}>;
export const emptyDevices: DeviceState = { devices: new Map(), executions: new Map() };
export function deviceStep(house: House, event: HouseEvent): House {
  const state = house.devices;
  if (event.kind === "device-registered") {
    if (!house.grants.has(event.by) || state.devices.has(event.data.id)) return house;
    const device = { ...event.data, owner: event.by, accepted: false, retired: false, inventory: [] };
    return { ...house, devices: { ...state, devices: new Map(state.devices).set(device.id, device) } };
  }
  if (event.kind === "device-execution-started") {
    if (state.executions.has(event.data.execution)) return house;
    const execution: DeviceExecution = { ...event.data, status: "running" };
    return {
      ...house,
      devices: { ...state, executions: new Map(state.executions).set(execution.execution, execution) },
    };
  }
  if (event.kind === "device-execution-unknown" || event.kind === "device-execution-result") {
    const old = state.executions.get(event.data.execution);
    if (!old || old.status !== "running") return house;
    const execution =
      event.kind === "device-execution-unknown"
        ? { ...old, status: "unknown" as const, reason: event.data.reason }
        : { ...old, status: event.data.status, reference: event.data.reference };
    return { ...house, devices: { ...state, executions: new Map(state.executions).set(old.execution, execution) } };
  }
  return deviceLifecycle(house, event);
}
function deviceLifecycle(house: House, event: HouseEvent): House {
  const state = house.devices;
  if (
    event.kind !== "device-accepted" &&
    event.kind !== "device-connected" &&
    event.kind !== "device-disconnected" &&
    event.kind !== "device-retired"
  )
    return house;
  const old = state.devices.get(event.data.device);
  if (!old || old.retired) return house;
  let device = old;
  if (
    event.kind === "device-accepted" &&
    house.grants.has(event.by) &&
    (event.by === old.owner || event.by === house.admin)
  )
    device = { ...old, accepted: true };
  if (
    event.kind === "device-retired" &&
    house.grants.has(event.by) &&
    (event.by === old.owner || event.by === house.admin)
  ) {
    const { connection: _connection, ...rest } = old;
    device = { ...rest, retired: true };
  }
  if (event.kind === "device-connected" && old.accepted && house.grants.has(old.owner))
    device = { ...old, connection: event.data.connection, inventory: event.data.inventory };
  if (event.kind === "device-disconnected" && old.connection === event.data.connection) {
    const { connection: _connection, ...rest } = old;
    device = rest;
  }
  return { ...house, devices: { ...state, devices: new Map(state.devices).set(old.id, device) } };
}

/** El motor cierra las conexiones anteriores antes de habilitar el acceso a la casa. */
export function deviceChoices(house: House, execution: ActionExecution | undefined, action: string) {
  if (!execution || execution.at === "house") return [];
  return [...house.devices.devices.values()]
    .filter(
      device =>
        device.accepted &&
        !device.retired &&
        device.connection &&
        house.grants.has(device.owner) &&
        supportsDeviceAction(device.inventory, execution.tool, execution.version, action),
    )
    .map(device => ({ kind: "device" as const, device: device.id, name: device.name }));
}
