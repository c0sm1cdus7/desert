import { startPrograms, programEffects } from "./boundaries/tool-listeners.ts";
import { interrupt, watchRunning } from "./execution/running-acts.ts";
// The house's own state and each tool's, folded together; attention as a perpetual, replayable ladder.
import { programRule } from "./execution/program-causes.ts";
import { actCatalog } from "../catalogs/acts.ts";
import { ids } from "../catalogs/ids.ts";
import { toolReminderLadder } from "../catalogs/time.ts";
import { holdsAny, emptyHouse, houseStep, identityView, mindTool, type Attention } from "../house/house.ts";
import { effect, processOf, type Event, type HouseEmission } from "../journal/events.ts";
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
  const offered = houseActs(attendanceActs(ports.registry));
  return (state: State<X>) => [
    ...offered(state.by),
    ...(mindTool(state.by) === undefined ? programRule(() => ports.own?.(state) ?? []) : []),
  ];
};
export function startTools<X extends Program>(ports: Starting<X>) {
  const { bus, state: read, registry, secrets } = ports;
  let state = read();
  let live = true;
  const running: Execution<X> = {
    ...ports,
    running: new Map(),
    live: () => live,
    process: ports.process ?? (() => false),
    own: ownOf(ports),
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
const reminderId = (by: string, tool: string): string => `${ids.attention}${JSON.stringify([by, tool])}`;
const reminder = (by: string, tool: string, delay: number | null, event: Event): HouseEmission[] => [
  effect("attention", { tool, delay }, by, [event.id]),
  effect("wake-at", { id: reminderId(by, tool), at: delay === null ? null : event.at + delay }, by, [event.id]),
];
/** A new entry on a tool: who it calls, and whether it starts that identity's reminders. */
function entryEffects<X extends Program>(
  state: State<X>,
  registry: ToolRegistry<X>,
  event: Extract<Event, { kind: "tool-entry" }>,
): readonly HouseEmission[] {
  const { tool, author, attention, draft, silent } = event.data;
  /** An entry written for the record calls nobody; the rest call whoever holds the tool and did not write it. */
  const quiet = silent || !holdsAny(state.house, state.by, tool) || (author === state.by && !attention) || draft;
  if (quiet) return [];
  const stimulus = effect("stimulus", { tool }, state.by, [event.id]);
  if (state.attends.some(target => targetTool(registry, state, target)?.id === tool) || state.attention.has(tool))
    return [stimulus];
  return [...reminder(state.by, tool, toolReminderLadder.firstMs, event), stimulus];
}
function attentionEffects<X extends Program>(
  state: State<X>,
  registry: ToolRegistry<X>,
  event: Event,
): readonly HouseEmission[] {
  if (event.layer !== "house") return [];
  if (event.kind === "attended" && event.by === state.by && !event.process) {
    const tool = targetTool(registry, state, event.data.target);
    return tool && state.attention.has(tool.id) ? reminder(state.by, tool.id, null, event) : [];
  }
  if ((event.kind === "granted" || event.kind === "kit-set") && event.by === state.house.admin)
    return [...state.attention.keys()].flatMap(tool =>
      holdsAny(houseStep(state.house, event), state.by, tool) ? [] : reminder(state.by, tool, null, event),
    );
  if (event.kind === "tool-entry") return entryEffects(state, registry, event);
  if (event.kind !== "woke") return [];
  const current = [...state.attention].find(([tool]) => reminderId(state.by, tool) === event.data.id);
  if (!current) return [];
  const [tool, attention] = current;
  if (!event.cause.includes(attention.wake)) return [];
  const delay = Math.min(attention.delay * toolReminderLadder.multiplier, toolReminderLadder.maxMs);
  return [...reminder(state.by, tool, delay, event), effect("stimulus", { tool }, state.by, [event.id])];
}
