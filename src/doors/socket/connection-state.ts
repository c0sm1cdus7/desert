// The last complete view and the house's clock survive a lost transport.
import { stateReceiver } from "./state-receiver.ts";
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
  const receiver = stateReceiver();
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
    watch: (watch: () => void) => addWatch(watchers, watch),
    reset: receiver.reset,
    metadata: (message: ServerMessage) => {
      if (message.tipo === "estado") receiver.begin(message);
      if (message.tipo === "bienvenida") identity = message.identidad;
      if (message.tipo === "bienvenida" || message.tipo === "estado")
        clock = { ahora: message.ahora, seq: message.seq, received: performance.now() };
    },
    accept: (bytes: Buffer): boolean => {
      const next = checkedState<X>(receiver, bytes, view, clock.seq, identity);
      if (!next) return false;
      view = next;
      status("connected");
      return true;
    },
  };
}

function checkedState<X extends Program>(
  receiver: ReturnType<typeof stateReceiver>,
  bytes: Buffer,
  view: State<X> | undefined,
  seq: number,
  identity: string,
): State<X> | undefined {
  const complete = receiver.accept(bytes, view);
  if (!complete) return;
  const next = complete.value;
  if (!isState<X>(next) || next.through !== seq || next.by !== identity) throw new Error("Invalid house state");
  return next;
}

function addWatch(watchers: Set<() => void>, watch: () => void) {
  watchers.add(watch);
  return () => void watchers.delete(watch);
}
