// Pending equality uses canonical JSON, never persisted; recovery keeps only opaque request identifiers.
import { randomUUID, createHash } from "node:crypto";
import type { Act } from "../../catalogs/acts.ts";
import type { Decision, ExecutionResult } from "../../tools/execute.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
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
  connection.receive(message => {
    if (message.tipo !== "resultado" && message.tipo !== "rechazo") return;
    if (!message.id) return;
    if (message.tipo === "resultado" && message.status === "processing") return;
    const waiting = pending.get(message.id);
    pending.delete(message.id);
    uncertain.delete(message.id);
    if (message.tipo === "rechazo") waiting?.done({ status: "rejected", reason: message.motivo, effects: [] });
    else if (message.status !== "processing")
      waiting?.done({
        status: message.status,
        effects: message.efectos,
        ...(message.reason ? { reason: message.reason } : {}),
        ...(message.private ? { private: message.private } : {}),
      });
  });
  connection.watch(() => {
    const next = connection.status() === "connected";
    if (!next) {
      for (const [id, waiting] of pending) {
        uncertain.add(id);
        waiting.done(interrupted());
      }
      pending.clear();
    } else for (const id of uncertain) connection.send({ tipo: "leer", id, qué: "pedido" });
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
    if (!connection.send({ tipo: "acto", id, ...value, through })) {
      pending.delete(id);
      uncertain.add(id);
      done(interrupted());
    }
    return result;
  };
}
