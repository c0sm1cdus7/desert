// A live shop house in memory, with virtualizable time and a real replay restart.
import { defectReporter } from "../../src/tools/failures/defect-reporter.ts";
import { checkedHouse } from "./journal-causes.ts";
import { SqliteJournal } from "../../src/storage/journal-store.ts";
import { createHouse, identityView } from "../../src/house/members.ts";
import { clockStep, startClock, type Deadlines, type TimeSource } from "../../src/journal/clock.ts";
import { Bus } from "../../src/journal/bus.ts";
import { effect } from "../../src/house/facts.ts";
import type { HousePorts } from "../../src/surface/bridge/ports/house-ports.ts";
import type { Execution } from "../../src/tools/execute.ts";
import type { ToolRegistry } from "../../src/tools/tool-contract.ts";
import { startState, toolsStep } from "../../src/house/state.ts";
import { startTools } from "../../src/tools/start.ts";
import { shop, shopRegistry, shopSlices, type Shop, type ShopEvent, type ShopFact } from "./shop.ts";

export const testTime: TimeSource = {
  now: () => Date.now(),
  wait: (at, fire) => {
    const timer = setTimeout(fire, Math.max(0, at - Date.now()));
    return () => clearTimeout(timer);
  },
};
/** The house runs as itself; the people in it are ana, who administers it, and beto. */
export const runner = "shop";
const plain = { capture: () => {}, scrub: <T>(value: T): T => value };
type Options = Readonly<{ registry?: ToolRegistry<Shop>; grants?: Readonly<Record<string, readonly string[]>> }> &
  Partial<Pick<Execution<Shop>, "own" | "process">> &
  Readonly<{ identities?: boolean }>;

type Journal = SqliteJournal<ShopFact>;
/** Fold the journal, then listen: a restart reads history before it attaches new observers. */
const resume = (bus: Bus<ShopFact>, journal: Journal, registry: ToolRegistry<Shop>, ports: Options) => {
  const state = journal.watch(
    "tools",
    startState<Shop>(shopSlices, runner, ports.identities, registry),
    (state, event) => toolsStep<Shop>(state, event, shopSlices),
  );
  journal.restore();
  const now = () => testTime.now();
  const tools = startTools({
    ...ports,
    bus,
    registry,
    state,
    now,
    secrets: plain,
    history: journal.replay<ShopEvent[]>([], (events, event) => [...events, event]),
  });
  const stopClock = startClock(bus, testTime, journal.replay<Deadlines>(new Map(), clockStep), runner);
  return { tools, stop: () => [tools.stop, stopClock].forEach(stop => stop()) };
};
/** The bus of a rig: every fact goes to its journal, and what an act writes goes whole or not at all. */
const busOf = (journal: SqliteJournal<ShopFact>) =>
  new Bus<ShopFact>(
    emission => journal.append(emission, Date.now()),
    write => journal.batch(write),
  );
/** The rig's identities read the house in Spanish, the language its expected screens are written in. */
const inSpanish = (grants: Readonly<Record<string, readonly string[]>>) => ({
  admin: "ana",
  language: "es" as const,
  assignments: Object.entries(grants).map(([identity, tools]) => ({ identity, tools, language: "es" as const })),
});
export function shopRig({ registry = shopRegistry, grants, ...ports }: Options = {}) {
  const all = registry.map(tool => tool.id);
  const journal = new SqliteJournal(":memory:", shop);
  const bus = busOf(journal);
  createHouse(bus, inSpanish(grants ?? { ana: all, beto: all }));
  let live = resume(bus, journal, registry, ports);
  const act = (by: string, act: string, input: unknown, target?: string, through = live.tools.state().through) =>
    live.tools.act({ act, input, ...(target === undefined ? {} : { target }) }, through, by);
  return checkedHouse({
    bus,
    journal,
    act,
    tools: () => live.tools,
    state: () => live.tools.state(),
    facts: () => journal.replay<ShopEvent[]>([], (events, event) => [...events, event]),
    attend: (by: string, target: string) => act(by, "attend", { target }),
    /** The house as a surface in its own process reaches it, for one identity. */
    ports: (me: string, now: () => number): HousePorts<Shop> => ({
      me,
      now,
      defect: defectReporter(registry, me, entry => bus.emit(entry), plain.scrub),
      registry,
      limits: { recentLines: 20 },
      state: () => identityView(live.tools.state(), me),
      act: (value, through) => live.tools.act(value, through, me),
      connection: () => "connected",
      watch: changed => bus.on(changed),
    }),
    /** What a house writes when it comes up, after its tools are listening. */
    boot: () => bus.emit(effect("boot", {}, runner)),
    restart: () => {
      live.stop();
      live = resume(bus, journal, registry, ports);
    },
    close: () => {
      live.stop();
      bus.close();
      journal.close();
    },
  });
}
