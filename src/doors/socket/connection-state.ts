// The last complete view and the house's clock survive a lost transport.
import { deserialize } from "node:v8";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { Screen } from "../../surface/contract.ts";
import type { ServerMessage } from "./protocol.ts";
function isState<X extends Program>(value: unknown): value is State<X> {
  return (
    typeof value === "object" &&
    value !== null &&
    "through" in value &&
    typeof value.through === "number" &&
    "tools" in value &&
    "house" in value &&
    "acts" in value &&
    value.acts instanceof Map &&
    "entries" in value &&
    Array.isArray(value.entries)
  );
}
export function connectionState<X extends Program>() {
  let view: State<X> | undefined;
  let identity = "";
  let state: Screen["state"] = "disconnected";
  let clock = { ahora: 0, received: performance.now(), seq: -1 };
  const watchers = new Set<() => void>();
  const changed = () => watchers.forEach(watch => watch());
  const status = (next: Screen["state"]) => {
    state = next;
    changed();
  };
  return {
    state: () => {
      if (!view) throw new Error("No house state received");
      return view;
    },
    identity: () => identity,
    now: () => clock.ahora + performance.now() - clock.received,
    status: () => state,
    setStatus: status,
    watch: (watch: () => void) => {
      watchers.add(watch);
      return () => void watchers.delete(watch);
    },
    metadata: (message: ServerMessage) => {
      if (message.tipo === "bienvenida") identity = message.identidad;
      if (message.tipo === "bienvenida" || message.tipo === "estado")
        clock = { ahora: message.ahora, seq: message.seq, received: performance.now() };
    },
    accept: (bytes: Buffer) => {
      const next: unknown = deserialize(bytes);
      if (!isState<X>(next) || next.through !== clock.seq || next.by !== identity)
        throw new Error("Invalid house state");
      view = next;
      status("connected");
    },
  };
}
