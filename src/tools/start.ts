// The house's own state and each tool's, folded together; attention as a perpetual, replayable ladder.
import { checkComposition, checkOwn } from "./execution/composed-authority.ts";
import { attentionEffects } from "./attention-effects.ts";
import { readonlyPorts } from "./boundaries/readonly-ports.ts";
import { startPrograms, programEffects } from "./boundaries/tool-listeners.ts";
import { interrupt, watchRunning } from "./execution/running-acts.ts";
import { programRule } from "../fields/program-call.ts";
import { identityView } from "../house/members.ts";
import { mindTool } from "../house/kit.ts";
import { actReach, execute, type Execution } from "./execute.ts";
import { houseActs } from "../house/scenes.ts";
import type { OwnAct, Program, State } from "./tool-contract.ts";
import { attendanceActs } from "../house/attention.ts";
/** What a program hands the engine; a program without processes or acts of its own leaves those out. */
type Starting<X extends Program> = Omit<Execution<X>, "live" | "own" | "process"> &
  Partial<Pick<Execution<X>, "own" | "process">>;
const ownOf = <X extends Program>(ports: Starting<X>) => {
  const houseOwn = new WeakSet<OwnAct<X>>();
  const offered = houseActs(attendanceActs(ports.registry));
  const own = (state: State<X>) => {
    const builtins = offered(state.by);
    builtins.forEach(act => houseOwn.add(act));
    const program = mindTool(state.by) === undefined ? programRule(() => ports.own?.(state) ?? []) : [];
    checkOwn(ports.registry, state, program);
    return [...builtins, ...program];
  };
  return {
    own,
    houseOwn: (act: OwnAct<X>) => houseOwn.has(act),
  };
};
export function startTools<X extends Program>(ports: Starting<X>) {
  const { bus, registry, secrets, state: read } = readonlyPorts(ports);
  let state = read();
  checkComposition(registry, state, ports.own);
  let live = true;
  const running: Execution<X> = {
    ...readonlyPorts(ports),
    running: new Map(),
    live: () => live,
    process: ports.process ?? (() => false),
    ...ownOf(ports),
  };
  const shutdown = startPrograms(registry, running);
  const cut = watchRunning(running);
  const stop = bus.on(event => {
    cut(event);
    const effects = programEffects(registry, state, event);
    for (const by of state.house.grants.keys())
      effects.push(...attentionEffects(identityView(state, by), registry, event));
    state = read();
    effects.forEach(effect => bus.emit(effect));
    if (event.layer === "house" && event.kind === "boot") interrupt(running, state);
  });
  return {
    state: read,
    prepare: <T>(value: T): T => {
      secrets.capture(value, registry, read());
      return secrets.scrub(value);
    },
    act: (value: unknown, through: number, by: string, cause: readonly string[] = []) =>
      execute(running, value, through, by, cause),
    reach: (by: string, act: Readonly<{ object: string; option: string }>) =>
      actReach(running, by, act.object, act.option),
    stop: () => {
      live = false;
      stop();
      shutdown();
    },
  };
}
