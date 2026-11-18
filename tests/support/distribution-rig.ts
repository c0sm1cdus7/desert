// Runs a composed distribution on an in-memory journal and replays it through the same engine.
import { SqliteJournal } from "../../src/storage/journal-store.ts";
import { Bus } from "../../src/journal/bus.ts";
import { createHouse } from "../../src/house/members.ts";
import { startState, toolsStep } from "../../src/house/state.ts";
import { startTools } from "../../src/tools/start.ts";
import { localPorts } from "../../src/runtime/house-runtime.ts";
import type { Composition } from "../../src/tools/promises-contract.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
import type { Event } from "../../src/journal/vocabulary.ts";
export function distributionRig<X extends Program>(program: Composition<X>) {
  const journal = new SqliteJournal(":memory:", program.words);
  const bus = new Bus<X["fact"]>(
    emission => journal.append(emission, 1000),
    write => journal.batch(write),
  );
  createHouse(bus, { admin: "ana", assignments: [{ identity: "ana", tools: program.registry.map(t => t.id) }] });
  const initial = () => startState(program.slices, "ana", program.identities, program.registry);
  const resume = () => {
    const state = journal.watch("tools", initial(), (state, event) => toolsStep(state, event, program.slices));
    journal.restore();
    return startTools({
      bus,
      registry: program.registry,
      history: journal.replay<Event<X["fact"]>[]>([], (events, event) => [...events, event]),
      state,
      now: () => 1000,
      secrets: { capture: () => {}, scrub: <T>(value: T) => value },
    });
  };
  let tools = resume();
  const house = () => ({ tools, bus, journal, registry: program.registry, now: () => 1000 });
  return {
    house,
    state: () => tools.state(),
    ports: () => localPorts(house(), "ana", { recentLines: 20 }),
    act: (act: string, target: string, input: unknown = {}) => tools.act({ act, target, input }, 0, "ana"),
    attend: (target: string) => tools.act({ act: "attend", input: { target } }, 0, "ana"),
    restart: () => {
      tools.stop();
      tools = resume();
    },
    close: () => {
      tools.stop();
      bus.close();
      journal.close();
    },
  };
}
