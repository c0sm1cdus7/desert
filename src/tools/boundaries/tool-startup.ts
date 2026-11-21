// Startup bus limited to original credentials and own wakes, with the author fixed by the house.
import { readonlyPorts } from "./readonly-ports.ts";
import { mindOf } from "../../house/kit.ts";
import { OutsideDefect, programCall } from "../../fields/program-call.ts";
import { startupMind } from "./startup-mind.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import type { Bus } from "../../journal/bus.ts";
import { effect, reminderWake } from "../../house/facts.ts";
import type { Emission, Event, Foreign } from "../../journal/vocabulary.ts";
import type { Execution } from "../execute.ts";
import type { Program, Tool } from "../tool-contract.ts";
import type { ToolStartup } from "../startup-contract.ts";
import { noCapabilities, type CapabilityLease } from "../execution/execution-capabilities.ts";

import { baseFunctions } from "./program-functions.ts";
const ofKind = <E extends { kind: string }, K extends string>(event: E, kind: K): event is E & { kind: K } =>
  event.kind === kind;
function programBus<P extends Foreign>(
  bus: Bus<P>,
  scope: { tool: string; owner: (id: string) => string | undefined },
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
  const emit = (entry: Emission<P>) => together(() => startupEmission(safe, scope, entry, lease));
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
  const lease = ports.capabilities?.({ actor: mindOf(tool.id), tool: tool.id, target: tool.id });
  const { ports: publicPorts, credentials } = lease ?? noCapabilities;
  const mind = startupMind(tool.id, ports);
  const bus = programBus(ports.bus, { tool: tool.id, owner: id => ports.state().wakeOwners.get(id) }, mind.hear, lease);
  const running: ToolStartup<X> = {
    ...baseFunctions(readonlyPorts({ state: ports.state, now: ports.now, live: ports.live })),
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

function startupEmission<P extends Foreign>(
  bus: Bus<P>,
  scope: { tool: string; owner: (id: string) => string | undefined },
  entry: Emission<P>,
  lease?: CapabilityLease,
) {
  const { tool, owner } = scope;
  const refuse = (): never => {
    throw new OutsideDefect(new Error(journalTexts.executionOnly));
  };
  const wakeRefuse = (): never => {
    throw new OutsideDefect(
      new Error("Despertar inválido o ajeno: pedí un despertar propio por el bus; para hechos usá act"),
    );
  };
  const isWake = entry.layer === "house" && entry.kind === "wake-at";
  const by: unknown = Reflect.get(entry, "by");
  if (by !== undefined && by !== mindOf(tool)) return isWake ? wakeRefuse() : refuse();
  if (entry.layer === "house" && entry.kind === "tool-entry" && lease?.apply(entry, true))
    return bus.emit(
      effect("tool-entry", { tool, target: tool, author: mindOf(tool), text: "", silent: true }, mindOf(tool)),
    );
  if (entry.layer !== "house" || entry.kind !== "wake-at") return refuse();
  if (Reflect.ownKeys(entry).some(key => !["layer", "kind", "data", "by"].includes(String(key)))) return wakeRefuse();
  const data: unknown = entry.data;
  if (data === null || typeof data !== "object") return wakeRefuse();
  const id: unknown = Reflect.get(data, "id");
  const at: unknown = Reflect.get(data, "at");
  if (Reflect.ownKeys(data).some(key => key !== "id" && key !== "at")) return wakeRefuse();
  if (
    typeof id !== "string" ||
    !id ||
    reminderWake(id) ||
    !(at === null || (typeof at === "number" && Number.isSafeInteger(at) && at >= 0))
  )
    return wakeRefuse();
  const held = owner(id);
  if (held !== undefined ? held !== mindOf(tool) : !id.startsWith(`${encodeURIComponent(tool)}:`)) return wakeRefuse();
  return bus.emit(effect("wake-at", { id, at }, mindOf(tool)));
}
