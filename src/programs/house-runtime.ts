import { checkComposition } from "../tools/execution/composed-authority.ts";
import { coreRegistry } from "../tools/core/identities/identities.ts";
import type { CalculationVersion } from "./calculation-version.ts";
import { houseResources } from "./house-resources.ts";
import { cancelInheritedWake } from "./inherited-wake.ts";
// One house running: its journal, its secrets kept apart, its tools listening, its clock, and a boot written last.
import { defectReporter } from "../tools/failures/defect-reporter.ts";
import type { HouseKeyProvider } from "../adapters/secrets/custody/house-keys.ts";
import { type ViewLimits } from "../catalogs/levers.ts";
import { checkCreation, InvalidCreation, createHouse, houseStep, identityView, type Creation } from "../house/house.ts";
import { startClock, systemTime, type TimeSource } from "../journal/clock.ts";
import { effect, type Vocabulary } from "../journal/events.ts";
import { houseProjections, requireProjectionVersion } from "./house-projections.ts";
import type { HousePorts } from "../surface/bridge/house-ports.ts";
import type { Execution } from "../tools/execute.ts";
import type { Program, Slices, ToolRegistry } from "../tools/tool-contract.ts";
import { startState, startTools } from "../tools/tools.ts";
import type { AdapterComposition } from "../adapters/declared/adapter-contract.ts";
/** What a program hands a house to live in it: its vocabulary, its tools, and what each of them keeps. */
export type HouseOptions<X extends Program> = AdapterComposition &
  Readonly<{ by: string; projectionVersion: CalculationVersion; creation: Creation }> &
  Readonly<{ words: Vocabulary<X["fact"]>; registry: ToolRegistry<X>; slices: Slices<X> }> &
  Partial<Pick<Execution<X>, "own" | "process">> &
  Readonly<{ secretKeys?: HouseKeyProvider; identities?: boolean }>;
/** A part is kept under its tool's id: that is how the house gives a whole tool, or none of it, to an identity. */
function ownerless<X extends Program>({ slices, registry }: HouseOptions<X>): string[] {
  return Object.keys(slices.step).filter(part => !registry.some(tool => tool.id === part));
}
function checkComposedCreation<X extends Program>(options: HouseOptions<X>) {
  const { by, registry, creation } = options;
  const initial = startState(options.slices, by, options.identities);
  const creationFacts = [
    effect("house-created", {}, creation.admin),
    ...creation.assignments.map(assignment =>
      effect("granted", { identity: assignment.identity, tools: [...assignment.tools] }, creation.admin),
    ),
  ];
  const preview = creationFacts.reduce(
    (house, each) =>
      houseStep(house, {
        ...each,
        id: "composition",
        seq: 0,
        at: 0,
      }),
    initial.house,
  );
  checkComposition(registry, { ...initial, house: preview }, options.own);
}
/** The composition as the house runs it, checked before anything opens. */
function composed<X extends Program>(given: HouseOptions<X>): HouseOptions<X> {
  const options = { ...given, registry: coreRegistry(given.registry, given.by, given.identities) };
  requireProjectionVersion(options.projectionVersion);
  if (!options.by) throw new Error("An explicit identity is required");
  if (ownerless(options).length) throw new Error(`No tool keeps the parts ${ownerless(options).join(", ")}`);
  checkComposedCreation(options);
  return options;
}
export function startHouse<X extends Program>(home: string, options: HouseOptions<X>, time: TimeSource = systemTime) {
  options = composed(options);
  const { by, registry, creation } = options;
  const ports = {
    ...(options.own ? { own: options.own } : {}),
    ...(options.process ? { process: options.process } : {}),
  };
  const { capabilities, protection, journal, secrets, bus, stops, report, close, notices } = houseResources(
    home,
    options,
    time,
  );
  try {
    const { state, clock } = houseProjections(journal, options);
    if (!state().house.admin) checkCreation(creation, by);
    protection.mark();
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
    const running = { home, bus, journal, tools, registry, close, storageNotices: notices.read, now: () => time.now() };
    return Object.assign(running, {
      cancelInheritedWake: (by: string, id: string) => cancelInheritedWake(state, bus, by, id),
    });
  } catch (error) {
    if (!(error instanceof InvalidCreation)) report(error, "program", "program", "start");
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
