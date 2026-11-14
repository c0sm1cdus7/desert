import { checkComposition, checkOwn } from "./execution/composed-authority.ts";
import { attentionEffects, reminderId } from "./attention-effects.ts";
import { startPrograms, programEffects } from "./boundaries/tool-listeners.ts";
import { interrupt, watchRunning } from "./execution/running-acts.ts";
// The house's own state and each tool's, folded together; attention as a perpetual, replayable ladder.
import { programRule } from "./execution/program-causes.ts";
import { actCatalog } from "../catalogs/acts.ts";
import { ids } from "../catalogs/ids.ts";
import { emptyHouse, houseStep, identityView, mindTool, type Attention } from "../house/house.ts";
import { effect, processOf, type Event } from "../journal/events.ts";
import { emptyMap, initial, listOf } from "../journal/projections.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { accepted, ownAct, reading, rejected } from "./act-definition.ts";
import { attendsStep, lookedStep, targetTool } from "./attendance.ts";
import { actReach, execute, type Execution } from "./execute.ts";
import { houseActs } from "./scenes.ts";
import type { HouseState, OwnAct, Program, Slices, State, ToolRegistry } from "./tool-contract.ts";
export const emptyHouseState: HouseState = initial({
  by: "",
  house: emptyHouse,
  attendance: emptyMap<readonly string[]>(),
  processing: emptyMap(),
  acts: emptyMap(),
  attentionBy: emptyMap<ReadonlyMap<string, Attention>>(),
  looked: emptyMap<ReadonlyMap<string, number>>(),
  entries: listOf(),
  attends: listOf<string>(),
  attention: emptyMap<Attention>(),
  through: 0,
});
/** Where a house starts for one identity: nothing in the house yet, and each tool as it begins. */
export const startState = <X extends Program>(slices: Slices<X>, by: string, identities = false): State<X> => ({
  ...emptyHouseState,
  house: identities ? { ...emptyHouse, identities: true } : emptyHouse,
  by,
  tools: slices.initial,
});
function attentionStep(state: ReadonlyMap<string, Attention>, event: Event): ReadonlyMap<string, Attention> {
  const next = new Map(state);
  if (event.layer !== "house") return next;
  if (event.kind === "attention") {
    if (event.data.delay === null) next.delete(event.data.tool);
    else next.set(event.data.tool, { delay: event.data.delay, wake: "" });
  }
  if (event.kind === "wake-at") {
    const current = [...next].find(([tool]) => reminderId(event.by, tool) === event.data.id);
    if (current) next.set(current[0], { ...current[1], wake: event.id });
  }
  return next;
}
/** The acts still open: an act stays until its result, so what it caused can be traced to it. */
function openActs(state: HouseState, event: Event): Pick<HouseState, "acts" | "processing"> {
  if (event.layer !== "house") return state;
  const acts = new Map(state.acts);
  const processing = new Map(state.processing);
  if (event.kind === "act") acts.set(event.id, event);
  if (event.kind === "act-started") processing.set(event.data.act, event);
  if (event.kind === "act-result") [acts, processing].forEach(open => open.delete(event.data.act));
  return { acts, processing };
}
function houseStateStep<S extends HouseState>(state: S, event: Event): S {
  const process = processOf(event);
  const attendance = new Map(state.attendance);
  const attentionBy = new Map(state.attentionBy);
  if (event.layer === "house" && (event.kind === "attended" || event.kind === "unattended"))
    attendance.set(process, attendsStep(attendance.get(process) ?? [], event));
  if (event.layer === "house" && (event.kind === "attention" || event.kind === "wake-at"))
    attentionBy.set(event.by, attentionStep(attentionBy.get(event.by) ?? new Map(), event));
  const entry = event.layer === "house" && event.kind === "tool-entry" ? [event] : [];
  return {
    ...state,
    ...openActs(state, event),
    attentionBy,
    attendance,
    looked: lookedStep(state.looked, event),
    house: houseStep(state.house, event),
    entries: entry.length ? [...state.entries, ...entry] : state.entries,
    attends: attendance.get(state.by) ?? [],
    attention: attentionBy.get(state.by) ?? new Map(),
    through: event.seq,
  };
}
/** Every fact moves the house, and each tool moves what it keeps: the house never reads a tool's part. */
export function toolsStep<X extends Program>(state: State<X>, event: Event<X["fact"]>, slices: Slices<X>): State<X> {
  const tools = { ...state.tools };
  for (const key in slices.step) tools[key] = programRule(() => slices.step[key](state.tools[key], event, state));
  return { ...houseStateStep(state, event), tools };
}
export const attendanceActs = <X extends Program>(registry: ToolRegistry<X>): OwnAct<X>[] =>
  (["attend", "unattend"] as const).map(option => {
    const act = ownAct<X, typeof actCatalog.attend.input>(
      ids.self,
      option,
      actCatalog[option],
      (input, { state, by }) => {
        const tool = targetTool(registry, state, input.target);
        if (!tool) return rejected(toolTexts.unknown);
        return accepted(effect(option === "attend" ? "attended" : "unattended", input, by));
      },
    );
    /** An attend brings into view something the identity has not read yet. */
    return option === "attend" ? reading(act) : act;
  });
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
  const { bus, state: read, registry, secrets } = ports;
  let state = read();
  checkComposition(registry, state, ports.own);
  let live = true;
  const running: Execution<X> = {
    ...ports,
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
