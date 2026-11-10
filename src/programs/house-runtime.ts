// One house running: its journal, its secrets kept apart, its tools listening, its clock, and a boot written last.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { SecretVault } from "../adapters/secrets/secret-vault.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { privateDirectoryMode, type ViewLimits } from "../catalogs/levers.ts";
import { createHouse, identityView, type Creation } from "../house/house.ts";
import { clockStep, startClock, systemTime, type Deadlines, type TimeSource } from "../journal/clock.ts";
import { Bus, effect, type Vocabulary } from "../journal/events.ts";
import type { HousePorts } from "../surface/bridge/house-ports.ts";
import type { Execution } from "../tools/execute.ts";
import type { KeyStore, Product, Slices, ToolRegistry } from "../tools/tool-contract.ts";
import { startState, startTools, toolsStep } from "../tools/tools.ts";
/** What a product hands a house to live in it: its vocabulary, its tools, and what each of them keeps. */
export type HouseOptions<X extends Product> = Readonly<{ by: string; creation: Creation; keys: KeyStore }> &
  Readonly<{ words: Vocabulary<X["fact"]>; registry: ToolRegistry<X>; slices: Slices<X> }> &
  Partial<Pick<Execution<X>, "refuse" | "own" | "process">>;
/** A part is kept under its tool's id: that is how the house gives a whole tool, or none of it, to an identity. */
function ownerless<X extends Product>({ slices, registry }: HouseOptions<X>): string[] {
  return Object.keys(slices.step).filter(part => !registry.some(tool => tool.id === part));
}
export function startHouse<X extends Product>(home: string, options: HouseOptions<X>, time: TimeSource = systemTime) {
  const { by, words, registry, slices, creation, ...ports } = options;
  if (!by) throw new Error("An explicit identity is required");
  if (ownerless(options).length) throw new Error(`No tool keeps the parts ${ownerless(options).join(", ")}`);
  mkdirSync(home, { recursive: true, mode: privateDirectoryMode });
  const journal = new SqliteJournal(join(home, "journal.sqlite"), words);
  const secrets = new SecretVault<X>(join(home, "secrets.sqlite"), words.event);
  const bus = new Bus<X["fact"]>(emission => {
    secrets.capture(emission, registry);
    return journal.append(secrets.scrub(emission), time.now());
  });
  const stops: (() => void)[] = [];
  const close = () => {
    stops.splice(0).forEach(stop => stop());
    for (const resource of [bus, journal, secrets]) resource.close();
  };
  try {
    const clock = journal.watch<Deadlines>("clock", new Map(), clockStep);
    const state = journal.watch(`tools:${by}`, startState<X>(slices, by), (state, event) =>
      toolsStep<X>(state, event, slices),
    );
    journal.restore();
    const tools = startTools({ ...ports, bus, secrets, registry, state, now: () => time.now() });
    if (!state().house.admin) createHouse(bus, creation);
    stops.push(tools.stop, startClock(bus, time, clock(), by));
    bus.emit(effect("boot", {}, by));
    return { bus, journal, tools, registry, close };
  } catch (error) {
    close();
    throw error;
  }
}
export type RunningHouse<X extends Product> = ReturnType<typeof startHouse<X>>;
/** A surface in the house's own process reads it and acts in it as one identity, with no door in between. */
export const localPorts = <X extends Product>(
  house: Pick<RunningHouse<X>, "tools" | "registry">,
  me: string,
  limits: ViewLimits,
): HousePorts<X> => ({
  me,
  limits,
  registry: house.registry,
  state: () => identityView(house.tools.state(), me),
  act: (value, through) => house.tools.act(value, through, me),
  now: () => Date.now(),
});
