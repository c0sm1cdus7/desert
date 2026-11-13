import type { Bus } from "../../journal/bus.ts";
import type { Emission, Event, Foreign } from "../../journal/events.ts";
import type { Execution } from "../execute.ts";
import type { Program, Tool } from "../tool-contract.ts";
import type { ToolStartup } from "../startup-contract.ts";
import { noCapabilities, type CapabilityLease } from "../execution/capabilities.ts";
import { programCall } from "./program-call.ts";
import { baseFunctions } from "./program-functions.ts";
const ofKind = <E extends { kind: string }, K extends string>(event: E, kind: K): event is E & { kind: K } =>
  event.kind === kind;
function programBus<P extends Foreign>(bus: Bus<P>, lease?: CapabilityLease) {
  function on(listener: (event: Event<P>) => void): () => void;
  function on<K extends Event<P>["kind"]>(kind: K, listener: (event: Event<P> & { kind: K }) => void): () => void;
  function on<K extends Event<P>["kind"]>(
    kind: K | ((event: Event<P>) => void),
    listener?: (event: Event<P> & { kind: K }) => void,
  ): () => void {
    return bus.on(event => {
      if (typeof kind === "function") programCall(kind, event);
      else if (ofKind(event, kind)) programCall(listener, event);
    });
  }
  const safe = baseFunctions(bus);
  const emit = (entry: Emission<P>) => {
    const write = () => {
      lease?.apply(entry, true);
      return safe.emit(entry);
    };
    return lease ? lease.together(() => safe.together(write)) : write();
  };
  return new Proxy(safe, {
    get: (target, key): unknown => {
      if (key === "on") return on;
      return key === "emit" ? emit : Reflect.get(target, key);
    },
  });
}
export function startProgram<X extends Program>(tool: Tool<X>, ports: Execution<X>): () => void {
  if (!tool.start) return () => {};
  const lease = ports.capabilities?.({ actor: ports.state().by, tool: tool.id, target: tool.id });
  const { ports: publicPorts, credentials } = lease ?? noCapabilities;
  const bus = programBus(ports.bus, lease);
  const running: ToolStartup<X> = {
    ...baseFunctions({ state: ports.state, now: ports.now, live: ports.live }),
    bus: { on: bus.on.bind(bus), emit: bus.emit.bind(bus), together: bus.together.bind(bus) },
    ports: publicPorts,
    credentials,
  };
  try {
    const stop = programCall(tool.start.bind(tool), running);
    return () => {
      try {
        programCall(stop);
      } finally {
        lease?.close();
      }
    };
  } catch (error) {
    lease?.close();
    throw error;
  }
}
