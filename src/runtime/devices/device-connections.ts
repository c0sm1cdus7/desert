// Keeps live device connections, takes their notices, and cuts pending work on disconnect, retirement or owner loss.
import { randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { publicValue } from "../../adapters/public-value.ts";
import {
  deviceInventory,
  type DeviceEndpoint,
  type DeviceLink,
  type NoticeAnswer,
} from "../../fields/device-protocol.ts";
import type { House } from "../../house/members.ts";
import type { HouseBus } from "../../journal/vocabulary.ts";
import { effect } from "../../house/facts.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import type { DeviceConnection } from "./device-dispatch.ts";
import { announceNotice, releaseNotice, type NoticePorts } from "./device-notices.ts";
function connectionState(bus: HouseBus, state: () => House, host: string) {
  const connections = new Map<string, DeviceConnection>();
  function disconnect(device: string, current: DeviceConnection, reason: string) {
    if (connections.get(device) !== current) return;
    connections.delete(device);
    // What was held is dropped first and unanswered: the device sends it again, since it never heard "recorded".
    current.held.clear();
    bus.emit(effect("device-disconnected", { device, connection: current.id, reason }, host));
    for (const unknown of [...current.pending.values()]) unknown(reason);
  }
  const stop = bus.on(() => {
    for (const [id, current] of connections) {
      const device = state().devices.devices.get(id);
      if (!device || device.retired || !state().grants.has(device.owner)) disconnect(id, current, deviceTexts.retired);
    }
  });
  return { connections, disconnect, stop };
}
function link(ports: NoticePorts, live: () => boolean, device: string, current: DeviceConnection) {
  return (notice: unknown, later: (answer: NoticeAnswer) => void, written: () => void = () => {}) => {
    if (!live()) throw new Error(deviceTexts.unavailable);
    return announceNotice(ports, device, current, notice, later, written);
  };
}
type Live = ReturnType<typeof connectionState>;
function opened(ports: NoticePorts, live: Live, host: string, device: string, endpoint: DeviceEndpoint): DeviceLink {
  const { bus } = ports;
  const { connections, disconnect } = live;
  if (connections.has(device)) throw new Error(deviceTexts.unavailable);
  const inventory = publicValue(endpoint.inventory);
  if (!Value.Check(deviceInventory, inventory) || new Set(inventory.map(each => each.tool)).size !== inventory.length)
    throw new Error(deviceTexts.invalid);
  const current: DeviceConnection = {
    id: randomUUID(),
    endpoint: { inventory, receive: request => endpoint.receive(request) },
    pending: new Map(),
    held: new Map(),
  };
  connections.set(device, current);
  bus.onRollback?.(() => {
    connections.delete(device);
  });
  try {
    bus.emit(effect("device-connected", { device, connection: current.id, inventory }, host));
  } catch (error) {
    connections.delete(device);
    throw error;
  }
  return {
    disconnect: () => disconnect(device, current, deviceTexts.disconnected),
    announce: link(ports, () => connections.get(device) === current, device, current),
  };
}
export function deviceConnections(ports: NoticePorts, host: string, ready: (id: string) => unknown) {
  const live = connectionState(ports.bus, ports.state, host);
  const { connections, disconnect, stop } = live;
  return {
    connections,
    /** A held notice of this execution is recorded now; the act already has its answer, so a failure stays here. */
    release(device: string, execution: string) {
      const current = connections.get(device);
      if (current) releaseNotice(ports, device, current, execution);
    },
    connect: (device: string, endpoint: DeviceEndpoint): DeviceLink => {
      ready(device);
      return opened(ports, live, host, device, endpoint);
    },
    close() {
      stop();
      for (const [device, current] of connections) disconnect(device, current, deviceTexts.closed);
    },
  };
}
export function recoverDevices(bus: HouseBus, house: House, host: string) {
  for (const device of house.devices.devices.values())
    if (device.connection)
      bus.emit(
        effect(
          "device-disconnected",
          { device: device.id, connection: device.connection, reason: deviceTexts.closed },
          host,
        ),
      );
  for (const execution of house.devices.executions.values())
    if (execution.status === "running")
      bus.emit(
        effect(
          "device-execution-unknown",
          { execution: execution.execution, reason: deviceTexts.closed },
          execution.actor,
          [execution.execution],
          execution.journey,
        ),
      );
}
