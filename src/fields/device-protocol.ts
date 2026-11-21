// Declares destinations, inventories, execution messages and notices, without identity or house capabilities.
import { Type, type Static } from "@sinclair/typebox";
import { object } from "./visible-text.ts";
const label = Type.String({ minLength: 1, maxLength: 200 });
export const executionDestination = Type.Union([
  object({ kind: Type.Literal("house") }),
  object({ kind: Type.Literal("device"), device: label }),
]);
export type ExecutionDestination = Static<typeof executionDestination>;
export const actionExecution = Type.Union([
  object({ at: Type.Literal("house") }),
  object({
    at: Type.Union([Type.Literal("device"), Type.Literal("either")]),
    tool: label,
    version: label,
    /** The device may later tell the house, unasked, that this execution finished, failed, was cancelled or lost. */
    announces: Type.Optional(Type.Literal(true)),
  }),
]);
export type ActionExecution = Static<typeof actionExecution>;
export const deviceInstallation = object({
  tool: label,
  version: label,
  actions: Type.Array(label, { minItems: 1, uniqueItems: true }),
});
export const deviceInventory = Type.Array(deviceInstallation, { maxItems: 256 });
export type DeviceInstallation = Readonly<{ tool: string; version: string; actions: readonly string[] }>;
export const deviceRegistration = object({
  id: label,
  name: label,
  publicKey: Type.String({ minLength: 1, maxLength: 1024 }),
});
export type DeviceRegistration = Static<typeof deviceRegistration>;
export const deviceRequest = object({
  execution: label,
  actor: label,
  program: label,
  action: label,
  tool: label,
  version: label,
  device: label,
  target: label,
  journey: Type.Optional(label),
  input: Type.Unknown(),
});
export type DeviceRequest = Static<typeof deviceRequest>;
export const deviceResult = Type.Union([
  object({ status: Type.Literal("accepted"), reference: label, value: Type.Optional(Type.Unknown()) }),
  object({
    status: Type.Literal("rejected"),
    reference: label,
    reason: Type.String({ maxLength: 4000 }),
    value: Type.Optional(Type.Unknown()),
  }),
]);
export type DeviceResult = Static<typeof deviceResult>;
export const noticeStatus = Type.Union([
  Type.Literal("finished"),
  Type.Literal("failed"),
  Type.Literal("cancelled"),
  Type.Literal("lost"),
]);
/** A device's unasked word about an announcing execution the house started; only the value stays out of the journal. */
export const deviceNotice = object({
  execution: label,
  status: noticeStatus,
  reference: label,
  value: Type.Optional(Type.Unknown()),
});
export type DeviceNotice = Static<typeof deviceNotice>;
/** The house's final answer: either way the device stops sending that notice. */
export type NoticeAnswer = "recorded" | "refused";
/** The durable outbox a device tool keeps: what it still owes the house survives restarts until it is answered. */
export type DeviceNotices = Readonly<{
  /** Every notice not yet answered, read again on each connection. */
  pending(): Promise<readonly DeviceNotice[]>;
  /** The house answered; once this resolves the notice is no longer pending. */
  acknowledge(execution: string, answer: NoticeAnswer): Promise<void>;
  /** Hears each notice born while connected; returns the way to stop hearing. */
  subscribe(send: (notice: DeviceNotice) => void): () => void;
}>;
/** Every tool's outbox joined, as the device's own transport reads it: `tell` hears each notice a tool keeps that
 * cannot travel, named by tool and execution; it stays owed in that tool and never holds back the rest. */
export type EndpointNotices = Readonly<{
  pending(tell: (reason: string) => void): Promise<readonly DeviceNotice[]>;
  acknowledge(execution: string, answer: NoticeAnswer): Promise<void>;
  subscribe(send: (notice: DeviceNotice) => void, tell: (reason: string) => void): () => void;
}>;
export type DeviceEndpoint = Readonly<{
  inventory: readonly DeviceInstallation[];
  receive(request: DeviceRequest): Promise<DeviceResult>;
  /** Present when an installed tool announces; the house never reads it, only the device's own transport does. */
  notices?: EndpointNotices;
}>;
/** What connecting a device returns. `announce` answers at once, or holds a notice whose execution still awaits its
 * start result and tells `later` once that result is written; a disconnect drops what is held without an answer. It
 * throws while the house cannot record, so the device keeps the notice. The first notice of an execution wins, held
 * or recorded, and every caller hears its answer. `written` hears the one call, now or later, that wrote the fact; a
 * repeat answers "recorded" without it. */
export type DeviceLink = Readonly<{
  disconnect: () => void;
  announce: (
    notice: DeviceNotice,
    later: (answer: NoticeAnswer) => void,
    written?: () => void,
  ) => NoticeAnswer | "held";
}>;

export const supportsDeviceAction = (
  inventory: readonly DeviceInstallation[],
  tool: string,
  version: string,
  action: string,
): boolean => inventory.some(each => each.tool === tool && each.version === version && each.actions.includes(action));
