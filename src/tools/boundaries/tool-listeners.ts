import type { Bus } from "../../journal/bus.ts";
// A program's startup, returned cleanup, and event reactions remain its code after registration.
import type { Emission, Event, Foreign } from "../../journal/events.ts";
import type { Execution } from "../execute.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
import { programRule } from "../execution/program-causes.ts";
import { closeResources } from "./close-resources.ts";
import { programCall } from "./program-call.ts";
import { baseFunctions } from "./program-functions.ts";

const ofKind = <E extends { kind: string }, K extends string>(event: E, kind: K): event is E & { kind: K } =>
  event.kind === kind;
function programBus<P extends Foreign>(bus: Bus<P>) {
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
  return new Proxy(baseFunctions(bus), {
    get: (target, key): unknown => (key === "on" ? on : Reflect.get(target, key)),
  });
}
export function startPrograms<X extends Program>(registry: ToolRegistry<X>, ports: Execution<X>) {
  const shutdown: (() => void)[] = [];
  const running = { ...baseFunctions(ports), bus: programBus(ports.bus) };
  try {
    for (const tool of registry) {
      const stop = programCall(tool.start?.bind(tool), running);
      if (stop) shutdown.push(() => programCall(stop));
    }
  } catch (error) {
    closeResources(shutdown, undefined, [error]);
  }
  return () => closeResources(shutdown);
}
export const programEffects = <X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  event: Event<X["fact"]>,
) => registry.flatMap((tool): Emission<X["fact"]>[] => [...programRule(() => tool.effects?.(state, event) ?? [])]);
