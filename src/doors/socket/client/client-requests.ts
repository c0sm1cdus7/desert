// Pending equality uses canonical JSON, never persisted; recovery keeps only opaque request identifiers.
import { same } from "../../../fields/phrases.ts";
import { requestDigest } from "../requests/public-message.ts";
import { socketLimits } from "../wire/protocol.ts";
import { randomUUID, createHash } from "node:crypto";
import type { Act } from "../../../house/own-acts.ts";
import type { Decision, ExecutionResult } from "../../../tools/execute.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import type { SocketConnection } from "./socket-connection.ts";
const interrupted = <X extends Program>(): Decision<X> => ({
  status: "interrupted",
  reason: socketTexts.interrupted,
  effects: [],
});
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]: [string, unknown]) => [key, canonical(item)]),
    );
  return value;
}
function recovery<X extends Program>(connection: SocketConnection<X>) {
  const pending = new Map<string, { key: string; result: ExecutionResult<X>; done: (value: Decision<X>) => void }>();
  const uncertain = new Set<string>();
  const lookup = recovering(connection, uncertain);
  connection.receive(message => {
    if (message.type !== "result" && message.type !== "rejection") return;
    const id = correlatedRequestId(message, pending.keys(), uncertain);
    if (!id) return;
    if (message.type === "rejection" && same(message.reason, socketTexts.quota) && uncertain.has(id)) {
      lookup.later();
      return;
    }
    if (message.type === "result" && message.status === "processing") return;
    const waiting = pending.get(id);
    pending.delete(id);
    uncertain.delete(id);
    if (message.type === "rejection") waiting?.done({ status: "rejected", reason: message.reason, effects: [] });
    else if (message.status !== "processing")
      waiting?.done({
        status: message.status,
        effects: message.effects,
        ...(message.reason ? { reason: message.reason } : {}),
        ...(message.private ? { private: message.private } : {}),
      });
  });
  connection.watch(() => {
    const next = connection.status() === "connected";
    if (!next) {
      lookup.cancel();
      for (const [id, waiting] of pending) {
        uncertain.add(id);
        waiting.done(interrupted());
      }
      pending.clear();
    } else lookup.now();
  });
  return { pending, uncertain };
}
export function clientRequests<X extends Program>(connection: SocketConnection<X>, automatic = false) {
  const { pending, uncertain } = recovery(connection);
  return (value: Act, through: number): ExecutionResult<X> => {
    if (connection.status() !== "connected") return interrupted();
    const key = automatic
      ? createHash("sha256")
          .update(JSON.stringify(canonical(value)))
          .digest("hex")
      : "";
    const previous = automatic && [...pending.values()].find(p => p.key === key);
    if (previous) return previous.result;
    const id = randomUUID();
    let done: (value: Decision<X>) => void = () => {};
    const completion = new Promise<Decision<X>>(resolve => {
      done = resolve;
    });
    const result: ExecutionResult<X> = { status: "processing", effects: [], completion };
    pending.set(id, { key, result, done });
    if (!connection.send({ type: "act", id, ...value, through })) {
      pending.delete(id);
      uncertain.add(id);
      done(interrupted());
    }
    return result;
  };
}

// A throttled lookup is still uncertain. Retry only the query, never the act; one timer covers the whole set.
function recovering<X extends Program>(connection: SocketConnection<X>, uncertain: Set<string>) {
  let timer: NodeJS.Timeout | undefined;
  const now = () => {
    if (connection.status() === "connected")
      for (const id of uncertain) connection.send({ type: "read", id, what: "request" });
  };
  return {
    now,
    later: () => {
      timer ??= setTimeout(() => {
        timer = undefined;
        now();
      }, socketLimits.requestMs);
      timer.unref();
    },
    cancel: () => {
      clearTimeout(timer);
      timer = undefined;
    },
  };
}

function correlatedRequestId(
  message: { id?: string; correlation?: string },
  pending: Iterable<string>,
  uncertain: Iterable<string>,
) {
  return message.correlation === "sha256"
    ? [...pending, ...uncertain].find(candidate => requestDigest(candidate) === message.id)
    : message.id;
}
