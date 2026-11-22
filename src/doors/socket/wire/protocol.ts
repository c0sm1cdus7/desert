// Defines the socket's limits and validates the messages between client and server.
import { executionDestination } from "../../../fields/device-protocol.ts";
import { wholeNumber } from "../../../fields/json-values.ts";
import { actLimits } from "../../../house/own-acts.ts";
/** Local house wire: equality includes the complete Node version because state uses v8 serialization. */
export const houseProtocolVersion = 4;
export const socketLimits = {
  /** A JSON frame holds an act within its bound plus room for the envelope, so what a mind may ask also travels. */
  json: actLimits.inputBytes + 64 * 1024,
  state: 16 * 1024 * 1024,
  chunk: 64 * 1024,
  helloMs: 5000,
  stateAttempts: 3,
  frameMs: 5000,
  drainMs: 10_000,
  blockedMs: 1000,
  pendingBytes: 1024 * 1024,
  unintroduced: 32,
  requests: 32,
  requestsPerTurn: 16,
  requestMs: 1000,
  waits: 8,
} as const;
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../../fields/visible-text.ts";
const name = Type.String({ minLength: 1, maxLength: 256 });
const text = Type.String();

const id = { id: name };
const correlation = { correlation: Type.Optional(Type.Literal("sha256")) };
const tag = <T extends string>(type: T) => ({ type: Type.Literal(type) });
const clientProtocol = Type.Union([
  object({ ...tag("hello"), protocol: wholeNumber, node: name, token: name }),
  object({
    ...tag("act"),
    ...id,
    act: name,
    target: Type.Optional(name),
    input: Type.Unknown(),
    destination: Type.Optional(executionDestination),
    through: wholeNumber,
  }),
  object({ ...tag("read"), ...id, what: name, since: Type.Optional(wholeNumber) }),
  object({ ...tag("wait"), ...id, until: wholeNumber }),
  object({ ...tag("default"), tool: name, target: name, option: name }),
  object(tag("sync")),
  object(tag("shutdown")),
  object(tag("bye")),
]);
const status = Type.Union(
  (["accepted", "rejected", "draft", "inconclusive", "interrupted", "processing"] as const).map(value =>
    Type.Literal(value),
  ),
);
const notice = object({
  layer: Type.Literal("house"),
  kind: Type.Literal("tool-entry"),
  data: object({ tool: text, target: text, author: text, text }),
  by: text,
  cause: Type.Array(text),
});
const done = object({
  layer: Type.Literal("house"),
  kind: Type.Literal("act-done"),
  data: object({ object: text, act: text, text }),
  by: text,
  cause: Type.Array(text),
});
const serverProtocol = Type.Union([
  object({
    ...tag("welcome"),
    protocol: wholeNumber,
    identity: name,
    admin: Type.Boolean(),
    now: wholeNumber,
    seq: wholeNumber,
  }),
  object({
    ...tag("state"),
    seq: wholeNumber,
    now: wholeNumber,
    base: Type.Union([wholeNumber, Type.Null()]),
    fingerprint: Type.String({ pattern: "^[a-f0-9]{64}$" }),
    bytes: wholeNumber,
  }),
  object({
    ...tag("result"),
    ...correlation,
    ...id,
    status,
    reason: Type.Optional(text),
    private: Type.Optional(text),
    effects: Type.Array(Type.Union([notice, done])),
  }),
  object({ ...tag("response"), ...correlation, ...id, seq: wholeNumber, data: Type.Unknown() }),
  object({ ...tag("rejection"), ...correlation, id: Type.Optional(name), reason: text }),
  object({ ...tag("cut"), reason: text }),
  object(tag("closing")),
]);
export type ClientMessage = Static<typeof clientProtocol>;
export type ServerMessage = Static<typeof serverProtocol>;
export type RequestAct = Extract<ClientMessage, { type: "act" }>;
export type ResultMessage = Extract<ServerMessage, { type: "result" }>;
export function readClient(value: unknown): ClientMessage {
  if (!Value.Check(clientProtocol, value)) throw new Error("Invalid client message");
  return value;
}
export function readServer(value: unknown): ServerMessage {
  if (!Value.Check(serverProtocol, value)) throw new Error("Invalid server message");
  return value;
}
