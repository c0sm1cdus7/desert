// Shared HTTP shapes and bounds for a device that reaches its house by challenge, connection and long polls.
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { deviceInventory, deviceRequest } from "../../fields/device-protocol.ts";
import { object } from "../../fields/visible-text.ts";
import { socketLimits } from "../socket/wire/protocol.ts";
export const deviceHttpLimits = {
  /** Every request body, the same bound as the socket's JSON frame. */
  body: socketLimits.json,
  /** How long a poll waits for work before answering with an empty list. */
  pollMs: 25_000,
  /** A session without any poll for this long is disconnected. */
  idleMs: 60_000,
  /** Requests queued or delivered and still awaiting their result, per session. */
  calls: 64,
  /** Requests handed out in one poll answer. */
  delivered: 16,
  /** Results accepted in one poll body. */
  results: 64,
  /** Live sessions in one house door. */
  sessions: 256,
  /** Outstanding challenges per device. */
  challenges: 8,
} as const;
export const devicePaths = {
  challenge: "/door/device/challenge",
  connect: "/door/device/connect",
  poll: "/door/device/poll",
} as const;
const label = Type.String({ minLength: 1, maxLength: 200 });
const call = Type.String({ minLength: 1, maxLength: 64 });
export const challengeBody = object({ device: label });
export const challengeAnswer = object({ id: label, message: Type.String({ minLength: 1, maxLength: 1024 }) });
export const connectBody = object({
  id: label,
  signature: Type.String({ minLength: 1, maxLength: 1024 }),
  inventory: deviceInventory,
});
export const connectAnswer = object({ session: Type.String({ pattern: "^[A-Za-z0-9_-]{43}$" }) });
/** A result travels as the device's receipt; `failed` says the device could not produce one, so it is unknown. */
export const callResult = Type.Union([
  object({ call, result: Type.Unknown() }),
  object({ call, failed: Type.Literal(true) }),
]);
export type CallResult = Static<typeof callResult>;
export const pollBody = object({ results: Type.Array(callResult, { maxItems: deviceHttpLimits.results }) });
export const pollAnswer = object({
  requests: Type.Array(object({ call, request: deviceRequest }), { maxItems: deviceHttpLimits.delivered }),
});
export type PollAnswer = Static<typeof pollAnswer>;
export function parsed<T extends TSchema>(schema: T, text: string): Static<T> | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  return Value.Check(schema, value) ? value : undefined;
}
