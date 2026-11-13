// A live shop house in memory, with virtualizable time and a real replay restart.
import { defectReporter } from "../../src/tools/failures/defect-reporter.ts";
import { SqliteJournal } from "../../src/adapters/storage/journal-store.ts";
import { createHouse, identityView } from "../../src/house/house.ts";
import { clockStep, startClock, type Deadlines, type TimeSource } from "../../src/journal/clock.ts";
import { Bus } from "../../src/journal/bus.ts";
import { effect } from "../../src/journal/events.ts";
import type { HousePorts } from "../../src/surface/bridge/house-ports.ts";
import type { Execution } from "../../src/tools/execute.ts";
import type { KeyStore, ToolRegistry } from "../../src/tools/tool-contract.ts";
import { startState, startTools, toolsStep } from "../../src/tools/tools.ts";
import { shop, shopRegistry, shopSlices, type Shop, type ShopEvent, type ShopFact } from "./shop.ts";

export class MemoryKeys implements KeyStore {
  readonly values = new Map<string, string>();
  get = (provider: string) => Promise.resolve(this.values.get(provider));
  set(provider: string, value: string): Promise<void> {
    this.values.set(provider, value);
    return Promise.resolve();
  }
  remove(provider: string): Promise<void> {
    this.values.delete(provider);
    return Promise.resolve();
  }
}
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
  Partial<Pick<Execution<Shop>, "own">>;

type Journal = SqliteJournal<ShopFact>;
/** Fold the journal, then listen: a restart reads history before it attaches new observers. */
const resume = (bus: Bus<ShopFact>, journal: Journal, registry: ToolRegistry<Shop>, ports: Options) => {
  const state = journal.watch("tools", startState<Shop>(shopSlices, runner), (state, event) =>
    toolsStep<Shop>(state, event, shopSlices),
  );
  journal.restore();
  const now = () => testTime.now();
  const tools = startTools({ ...ports, bus, registry, state, now, keys: new MemoryKeys(), secrets: plain });
  const stopClock = startClock(bus, testTime, journal.replay<Deadlines>(new Map(), clockStep), runner);
  return { tools, stop: () => [tools.stop, stopClock].forEach(stop => stop()) };
};
/** The bus of a rig: every fact goes to its journal, and what an act writes goes whole or not at all. */
const busOf = (journal: SqliteJournal<ShopFact>) =>
  new Bus<ShopFact>(
    emission => journal.append(emission, Date.now()),
    write => journal.batch(write),
  );
export function shopRig({ registry = shopRegistry, grants, ...ports }: Options = {}) {
  const all = registry.map(tool => tool.id);
  const journal = new SqliteJournal(":memory:", shop);
  const bus = busOf(journal);
  const members = Object.entries(grants ?? { ana: all, beto: all });
  createHouse(bus, { admin: "ana", assignments: members.map(([identity, tools]) => ({ identity, tools })) });
  let live = resume(bus, journal, registry, ports);
  const act = (by: string, act: string, input: unknown, target?: string, through = live.tools.state().through) =>
    live.tools.act({ act, input, ...(target === undefined ? {} : { target }) }, through, by);
  return {
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
  };
}
