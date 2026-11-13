import { closeResources } from "../tools/boundaries/close-resources.ts";
// One house running: its journal, its secrets kept apart, its tools listening, its clock, and a boot written last.
import { defectReporter } from "../tools/failures/defect-reporter.ts";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { SecretVault } from "../adapters/secrets/secret-vault.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { privateDirectoryMode, type ViewLimits } from "../catalogs/levers.ts";
import { createHouse, identityView, type Creation } from "../house/house.ts";
import { startClock, systemTime, type TimeSource } from "../journal/clock.ts";
import { Bus } from "../journal/bus.ts";
import { effect, type Emission, type Vocabulary } from "../journal/events.ts";
import { houseProjections, requireProjectionVersion } from "./house-projections.ts";
import type { HousePorts } from "../surface/bridge/house-ports.ts";
import type { Execution } from "../tools/execute.ts";
import type { KeyStore, Program, Slices, ToolRegistry } from "../tools/tool-contract.ts";
import { startTools } from "../tools/tools.ts";
/** What a program hands a house to live in it: its vocabulary, its tools, and what each of them keeps. */
export type HouseOptions<X extends Program> = Readonly<{
  by: string;
  projectionVersion: string;
  creation: Creation;
  keys: KeyStore;
}> &
  Readonly<{ words: Vocabulary<X["fact"]>; registry: ToolRegistry<X>; slices: Slices<X> }> &
  Partial<Pick<Execution<X>, "own" | "process">>;
/** A part is kept under its tool's id: that is how the house gives a whole tool, or none of it, to an identity. */
function ownerless<X extends Program>({ slices, registry }: HouseOptions<X>): string[] {
  return Object.keys(slices.step).filter(part => !registry.some(tool => tool.id === part));
}
/** The bus of a running house: every fact is written to its journal as `kept` leaves it. What one act writes goes
 * whole or not at all, and all of it happens at one instant: the one at which it began to be written. */
function busOf<X extends Program>(
  journal: SqliteJournal<X["fact"]>,
  time: TimeSource,
  kept: (emission: Emission<X["fact"]>) => Emission<X["fact"]>,
) {
  let together: number | undefined;
  return new Bus<X["fact"]>(
    emission => journal.append(kept(emission), together ?? time.now()),
    write =>
      journal.batch(() => {
        const outer = together;
        together = outer ?? time.now();
        try {
          return write();
        } finally {
          together = outer;
        }
      }),
  );
}
export function startHouse<X extends Program>(home: string, options: HouseOptions<X>, time: TimeSource = systemTime) {
  requireProjectionVersion(options.projectionVersion);
  const { by, words, registry, creation, ...ports } = options;
  if (!by) throw new Error("An explicit identity is required");
  if (ownerless(options).length) throw new Error(`No tool keeps the parts ${ownerless(options).join(", ")}`);
  mkdirSync(home, { recursive: true, mode: privateDirectoryMode });
  const journal = new SqliteJournal(join(home, "journal.sqlite"), words);
  const secrets = new SecretVault<X>(join(home, "secrets.sqlite"), words.event);
  const bus = busOf<X>(journal, time, emission => {
    secrets.capture(emission, registry);
    return secrets.scrub(emission);
  });
  const stops: (() => void)[] = [];
  const report = defectReporter(
    registry,
    by,
    entry => journal.append(entry, time.now()),
    value => secrets.scrub(value),
  );
  const close = () =>
    closeResources([...stops.splice(0), ...[bus, journal, secrets].map(resource => () => resource.close())], error => {
      report(error, "program", "program", "stop");
    });
  try {
    const { state, clock } = houseProjections(journal, options);
    const tools = startTools({ ...ports, bus, secrets, registry, state, now: () => time.now() });
    if (!state().house.admin) createHouse(bus, creation);
    stops.push(tools.stop, startClock(bus, time, clock(), by));
    bus.emit(effect("boot", {}, by));
    return { bus, journal, tools, registry, close, now: () => time.now() };
  } catch (error) {
    report(error, "program", "program", "start");
    close();
    throw error;
  }
}
export type RunningHouse<X extends Program> = ReturnType<typeof startHouse<X>>;
/** A surface in the house's own process reads it and acts in it as one identity, with no door in between; it
 * reads the same clock as the house. */
export const localPorts = <X extends Program>(
  house: Pick<RunningHouse<X>, "tools" | "registry" | "bus" | "now">,
  me: string,
  limits: Omit<ViewLimits, "now">,
  now: () => number = house.now,
): HousePorts<X> => ({
  me,
  limits,
  registry: house.registry,
  state: () => identityView(house.tools.state(), me),
  act: (value, through) => house.tools.act(value, through, me),
  now,
  defect: defectReporter(house.registry, me, entry => house.bus.emit(entry), house.tools.prepare),
  connection: () => "connected",
  watch: changed => house.bus.on(changed),
});
