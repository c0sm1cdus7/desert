import type { CalculationVersion } from "./calculation-version.ts";
import { houseResources } from "./house-resources.ts";
// One house running: its journal, its secrets kept apart, its tools listening, its clock, and a boot written last.
import { defectReporter } from "../tools/failures/defect-reporter.ts";
import type { HouseKeyProvider } from "../adapters/secrets/custody/house-keys.ts";
import { type ViewLimits } from "../catalogs/levers.ts";
import { createHouse, identityView, type Creation } from "../house/house.ts";
import { startClock, systemTime, type TimeSource } from "../journal/clock.ts";
import { effect, type Vocabulary } from "../journal/events.ts";
import { houseProjections, requireProjectionVersion } from "./house-projections.ts";
import type { HousePorts } from "../surface/bridge/house-ports.ts";
import type { Execution } from "../tools/execute.ts";
import type { Program, Slices, ToolRegistry } from "../tools/tool-contract.ts";
import { startTools } from "../tools/tools.ts";
import type { AdapterComposition } from "../adapters/declared/adapter-contract.ts";
/** What a program hands a house to live in it: its vocabulary, its tools, and what each of them keeps. */
export type HouseOptions<X extends Program> = AdapterComposition &
  Readonly<{ by: string; projectionVersion: CalculationVersion; creation: Creation }> &
  Readonly<{ words: Vocabulary<X["fact"]>; registry: ToolRegistry<X>; slices: Slices<X> }> &
  Partial<Pick<Execution<X>, "own" | "process">> &
  Readonly<{ secretKeys?: HouseKeyProvider }>;
/** A part is kept under its tool's id: that is how the house gives a whole tool, or none of it, to an identity. */
function ownerless<X extends Program>({ slices, registry }: HouseOptions<X>): string[] {
  return Object.keys(slices.step).filter(part => !registry.some(tool => tool.id === part));
}
export function startHouse<X extends Program>(home: string, options: HouseOptions<X>, time: TimeSource = systemTime) {
  requireProjectionVersion(options.projectionVersion);
  const { by, registry, creation } = options;
  const ports = {
    ...(options.own ? { own: options.own } : {}),
    ...(options.process ? { process: options.process } : {}),
  };
  if (!by) throw new Error("An explicit identity is required");
  if (ownerless(options).length) throw new Error(`No tool keeps the parts ${ownerless(options).join(", ")}`);
  const { capabilities, protection, journal, secrets, bus, stops, report, close, notices } = houseResources(
    home,
    options,
    time,
  );
  try {
    protection.mark();
    const { state, clock } = houseProjections(journal, options);
    protection.attach(secrets, state);
    const tools = startTools({
      ...ports,
      ...capabilities(state),
      bus,
      secrets,
      registry,
      state,
      now: () => time.now(),
    });
    if (!state().house.admin) createHouse(bus, creation);
    stops.push(tools.stop, startClock(bus, time, clock(), by));
    bus.emit(effect("boot", {}, by));
    return { bus, journal, tools, registry, close, storageNotices: notices.read, now: () => time.now() };
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
export type {
  AdapterComposition,
  AdapterDeclaration,
  AdapterMethod,
  SecretResolver,
} from "../adapters/declared/adapter-contract.ts";

export { maintainHouseCustody, type CustodyMaintenance } from "./house-custody-maintenance.ts";
