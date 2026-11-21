// Checks and starts tools, reactions and attention; dispatches acts and closes the engine.
import { scrubDoorValue } from "../house/doors/door-material.ts";
import { checkComposition, checkOwn } from "./execution/composed-authority.ts";
import { attentionEffects } from "./attention-effects.ts";
import { readonlyPorts } from "./boundaries/readonly-ports.ts";
import { startPrograms } from "./boundaries/tool-listeners.ts";
import { startReactions } from "./boundaries/tool-reactions.ts";
import type { Event } from "../journal/vocabulary.ts";
import { interrupt, watchRunning } from "./execution/running-acts.ts";
import { programRule } from "../fields/program-call.ts";
import { identityView } from "../house/members.ts";
import { journeyFrozen } from "../house/minds/journey-state.ts";
import { isMindActor } from "../fields/mind-actor.ts";
import { actReach, execute, type Execution } from "./execute.ts";
import { houseActs } from "../house/scenes.ts";
import type { OwnAct, Program, State } from "./tool-contract.ts";
import { attendanceActs } from "../house/attention.ts";
/** What a program hands the engine; a program without processes or acts of its own leaves those out. */
type Starting<X extends Program> = Omit<Execution<X>, "live" | "own" | "process"> &
  Partial<Pick<Execution<X>, "own" | "process">> &
  Readonly<{ history: readonly Event<X["fact"]>[] }>;
const ownOf = <X extends Program>(ports: Starting<X>) => {
  const houseOwn = new WeakSet<OwnAct<X>>();
  const offered = houseActs(attendanceActs(ports.registry));
  const own = (state: State<X>) => {
    const builtins = offered(state.by);
    builtins.forEach(act => houseOwn.add(act));
    const program = !isMindActor(state.by) ? programRule(() => ports.own?.(state) ?? []) : [];
    checkOwn(ports.registry, state, program);
    return [...builtins, ...program];
  };
  return {
    own,
    houseOwn: (act: OwnAct<X>) => houseOwn.has(act),
  };
};
const processOf =
  <X extends Program>(ports: Starting<X>) =>
  (id: string, by?: string): boolean => {
    const journey = ports.state().house.journeys.get(id);
    if (!journey) return ports.process?.(id, by) ?? false;
    return !journey.closed && !journeyFrozen(journey) && (by === undefined || journey.by === by);
  };
function watchAttention<X extends Program>(ports: Execution<X>) {
  let state = ports.state();
  const cut = watchRunning(ports);
  return ports.bus.on(event => {
    cut(event);
    const effects = [];
    for (const by of state.house.grants.keys())
      effects.push(...attentionEffects(identityView(state, by), ports.registry, event));
    state = ports.state();
    effects.forEach(effect => ports.bus.emit(effect));
    if (event.layer === "house" && event.kind === "boot") interrupt(ports, state);
  });
}
export function startTools<X extends Program>(ports: Starting<X>) {
  const { registry, secrets, state: read } = readonlyPorts(ports);
  checkComposition(registry, read(), ports.own);
  let live = true;
  const running: Execution<X> = {
    ...readonlyPorts(ports),
    running: new Map(),
    live: () => live,
    process: processOf(ports),
    ...ownOf(ports),
  };
  const reactions = startReactions(running, ports.history);
  let shutdown: () => void;
  try {
    shutdown = startPrograms(registry, running);
  } catch (error) {
    reactions.stop();
    throw error;
  }
  const stop = watchAttention(running);
  return {
    state: read,
    recoverReactions: reactions.recover,
    pendingReactions: reactions.pending,
    prepare: <T>(value: T): T => {
      secrets.capture(value, registry, read());
      return scrubDoorValue(secrets.scrub(value), read().house.doors);
    },
    act: (value: unknown, through: number, by: string, cause: readonly string[] = [], authorization?: AbortSignal) =>
      execute({ ...running, ...(authorization ? { authorization } : {}) }, value, through, by, cause),
    reach: (by: string, act: Readonly<{ object: string; option: string }>) =>
      actReach(running, by, act.object, act.option),
    stop: () => {
      live = false;
      stop();
      reactions.stop();
      shutdown();
    },
  };
}
