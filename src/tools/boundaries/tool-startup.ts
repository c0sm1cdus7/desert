import { OutsideDefect } from "../outside.ts";
import { startupMind } from "./startup-mind.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
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
function programBus<P extends Foreign>(
  bus: Bus<P>,
  hear: (id: string, listener: () => void) => void,
  lease?: CapabilityLease,
) {
  function on(listener: (event: Event<P>) => void): () => void;
  function on<K extends Event<P>["kind"]>(kind: K, listener: (event: Event<P> & { kind: K }) => void): () => void;
  function on<K extends Event<P>["kind"]>(
    kind: K | ((event: Event<P>) => void),
    listener?: (event: Event<P> & { kind: K }) => void,
  ): () => void {
    return bus.on(event =>
      hear(event.id, () => {
        if (typeof kind === "function") programCall(kind, event);
        else if (ofKind(event, kind)) programCall(listener, event);
      }),
    );
  }
  const safe = baseFunctions(bus);
  const together = <T>(work: () => T): T => safe.together(() => (lease ? lease.together(work) : work()));
  const emit = (entry: Emission<P>) => {
    if (entry.layer === "house" && ["act", "act-started", "act-result", "act-done"].includes(entry.kind))
      throw new OutsideDefect(new Error(journalTexts.executionOnly));
    const write = () => {
      lease?.apply(entry, true);
      return safe.emit(entry);
    };
    return together(write);
  };
  return new Proxy(safe, {
    get: (target, key): unknown => {
      if (key === "on") return on;
      if (key === "together") return together;
      return key === "emit" ? emit : Reflect.get(target, key);
    },
  });
}
export function startProgram<X extends Program>(tool: Tool<X>, ports: Execution<X>): () => void {
  if (!tool.start) return () => {};
  const lease = ports.capabilities?.({ actor: ports.state().by, tool: tool.id, target: tool.id });
  const { ports: publicPorts, credentials } = lease ?? noCapabilities;
  const mind = startupMind(tool.id, ports);
  const bus = programBus(ports.bus, mind.hear, lease);
  const running: ToolStartup<X> = {
    ...baseFunctions({ state: ports.state, now: ports.now, live: ports.live }),
    bus: { on: bus.on.bind(bus), emit: bus.emit.bind(bus), together: bus.together.bind(bus) },
    ports: publicPorts,
    credentials,
    act: mind.act,
  };
  try {
    const stop = programCall(tool.start.bind(tool), running);
    return () => {
      mind.close();
      try {
        programCall(stop);
      } finally {
        lease?.close();
      }
    };
  } catch (error) {
    mind.close();
    lease?.close();
    throw error;
  }
}
