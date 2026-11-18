// One house running: its journal, its secrets kept apart, its tools listening, its clock, and a boot written last.
import { journalTexts } from "../texts/journal.texts.ts";
import type { Event } from "../journal/vocabulary.ts";
import { checkKitMigration } from "../house/kit-migration.ts";
import { programKit } from "../house/kit-selection.ts";
import { checkComposition } from "../tools/execution/composed-authority.ts";
import { coreRegistry } from "../tools/identities/identities.ts";
import { houseResources } from "./house-resources.ts";
import { cancelInheritedWake } from "../house/inherited-wake.ts";
import { defectReporter } from "../tools/failures/defect-reporter.ts";
import type { ViewLimits, Program } from "../tools/tool-contract.ts";
import { checkCreation, InvalidCreation, createHouse, houseStep, identityView } from "../house/members.ts";
import { startClock, systemTime, type TimeSource } from "../journal/clock.ts";
import { effect } from "../house/facts.ts";
import { requireProjectionVersion } from "./house-projections.ts";
import type { HousePorts } from "../surface/bridge/ports/house-ports.ts";

import { startState, type HouseOptions } from "../house/state.ts";
import type { ModelHouseOptions } from "./minds/mind-runtime-options.ts";
import { requireMind } from "../fields/mind-errors.ts";
import type { ModelMinds } from "./minds/mind-runtime.ts";
import { startTools } from "../tools/start.ts";

/** A part is kept under its tool's id: that is how the house gives a whole tool, or none of it, to an identity. */
function ownerless<X extends Program>({ slices, registry }: HouseOptions<X>): string[] {
  return Object.keys(slices.step).filter(part => !registry.some(tool => tool.id === part));
}
function checkComposedCreation<X extends Program>(options: HouseOptions<X>) {
  const { by, registry, creation } = options;
  const initial = startState(options.slices, by, options.identities, options.registry);
  const creationFacts = [
    effect("house-created", {}, creation.admin),
    ...creation.assignments.map(assignment =>
      effect(
        "granted",
        { version: 2, identity: assignment.identity, kit: programKit(assignment.tools) },
        creation.admin,
      ),
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
function composed<X extends Program>(given: ModelHouseOptions<X>): ModelHouseOptions<X> {
  const options = {
    ...given,
    registry: coreRegistry(given.registry, given.by, given.identities, given.mentes?.asistentes),
  };
  requireProjectionVersion(options.projectionVersion);
  if (options.mentes) {
    const { asistentes, programas } = options.mentes;
    requireMind(typeof asistentes === "boolean" && Array.isArray(programas), "mentes");
    requireMind(!asistentes || options.identities, "mentes.identities");
    requireMind(new Set(programas).size === programas.length, "mentes.duplicate");
    requireMind(
      programas.every(id => id !== "identities" && options.registry.some(tool => tool.id === id)),
      "mentes.program",
    );
    requireMind(!(asistentes || programas.length) || options.modelMinds, "mentes.options");
  }
  if (options.kitMigration) checkKitMigration(options.kitMigration, options.registry);
  if (!options.by) throw new Error("An explicit identity is required");
  if (ownerless(options).length) throw new Error(`No tool keeps the parts ${ownerless(options).join(", ")}`);
  checkComposedCreation(options);
  return options;
}
function houseContracts<X extends Program>(options: HouseOptions<X>, resources: ReturnType<typeof houseResources<X>>) {
  const { state, journal } = resources;
  const { slices, by, identities, registry, kitMigration } = options;
  return options.contractSetup?.({
    state,
    registry,
    slices,
    initial: startState(slices, by, identities, registry, kitMigration),
    events: () => journal.replay<Event<X["fact"]>[]>([], (events, event) => [...events, event]),
  });
}
export function startHouse<X extends Program>(
  home: string,
  options: ModelHouseOptions<X>,
  time: TimeSource = systemTime,
) {
  options = composed(options);
  const { by, registry, creation } = options;
  const ports = {
    ...(options.own ? { own: options.own } : {}),
    ...(options.process ? { process: options.process } : {}),
  };
  const resources = houseResources(home, options, time);
  const { capabilities, protection, journal, secrets, bus, stops, report, close, state, clock } = resources;
  try {
    if (!state().house.admin) checkCreation(creation, by);
    protection.mark();
    protection.attach(secrets, state);
    const contracts = houseContracts(options, resources);
    const tools = startTools({
      ...(contracts ? { contracts } : {}),
      ...ports,
      ...capabilities(state),
      bus,
      secrets,
      registry,
      history: journal.replay<Event<X["fact"]>[]>([], (events, event) => [...events, event]),
      state,
      now: () => time.now(),
    });
    if (!state().house.admin) createHouse(bus, creation);
    stops.push(tools.stop, startClock(bus, time, clock(), by));
    bus.emit(effect("boot", {}, by));
    const minds = loadMinds(home, options, time, resources, contracts);
    return runningHouse(home, registry, tools, time, resources, minds?.ready, minds?.notices);
  } catch (error) {
    if (!(error instanceof InvalidCreation)) report(error, "program", "program", "start");
    close();
    throw error;
  }
}
function runningHouse<X extends Program>(
  home: string,
  registry: HouseOptions<X>["registry"],
  tools: ReturnType<typeof startTools<X>>,
  time: TimeSource,
  resources: ReturnType<typeof houseResources<X>>,
  ready?: Promise<ModelMinds | undefined>,
  mindNotices?: () => readonly string[],
) {
  const { bus, journal, close, notices, state } = resources;
  return {
    home,
    bus,
    journal,
    tools,
    registry,
    close,
    ...(ready ? { minds: ready } : {}),
    storageNotices: notices.read,
    ...(mindNotices ? { mindNotices } : {}),
    storageUnsaved: notices.unsaved,
    now: () => time.now(),
    cancelInheritedWake: (by: string, id: string) => cancelInheritedWake(state, bus, by, id),
  };
}
function mindHouse<X extends Program>(
  home: string,
  options: ModelHouseOptions<X>,
  time: TimeSource,
  resources: ReturnType<typeof houseResources<X>>,
  active: () => boolean,
  contracts?: import("../tools/contract-port.ts").ContractFactory,
) {
  const { capabilities, state, bus, secrets, journal, report, close } = resources;
  return {
    home,
    time,
    active,
    execution: {
      ...(contracts ? { contracts } : {}),
      ...capabilities(state),
      bus,
      registry: options.registry,
      state,
      secrets,
      now: () => time.now(),
      live: active,
      own: () => [],
      process: (id: string, by?: string) => {
        const journey = state().house.journeys.get(id);
        return !!journey && !journey.closed && (by === undefined || journey.by === by);
      },
    },
    history: () =>
      journal.replay<ReturnType<typeof journal.append>[]>([], (events, event) => {
        events.push(event);
        return events;
      }),
    failed: (error: Error) => {
      report(error, "program", "program", "minds");
      close();
    },
  };
}
function loadMinds<X extends Program>(
  home: string,
  options: ModelHouseOptions<X>,
  time: TimeSource,
  resources: ReturnType<typeof houseResources<X>>,
  contracts?: import("../tools/contract-port.ts").ContractFactory,
) {
  const switches = options.mentes;
  const config = options.modelMinds;
  if (!switches || !(switches.asistentes || switches.programas.length) || !config) return undefined;
  let active = true;
  let minds: ModelMinds | undefined;
  resources.stops.unshift(() => {
    active = false;
    minds?.close();
  });
  const houseActive = () => active;
  const ready = import("./minds/mind-runtime.ts")
    .then(async ({ startModelMinds }) => {
      if (!houseActive()) return undefined;
      const house = mindHouse(home, options, time, resources, () => active, contracts);
      const { prepareProgramMinds } = await import("./minds/program-mind-bank.ts");
      const prepared = await prepareProgramMinds(house, config, switches);
      if (!houseActive()) return undefined;
      minds = startModelMinds(house, switches, prepared);
      return minds;
    })
    .catch((error: unknown) => {
      resources.close();
      throw error;
    });
  return { ready, notices: () => minds?.notices() ?? [] };
}
export type RunningHouse<X extends Program> = ReturnType<typeof startHouse<X>>;
/** A surface in the house's own process reads it and acts in it as one identity, with no door in between; it
 * reads the same clock as the house. */
export const localPorts = <X extends Program>(
  house: Pick<RunningHouse<X>, "tools" | "registry" | "bus" | "now"> &
    Partial<Pick<RunningHouse<X>, "storageNotices" | "storageUnsaved" | "mindNotices">>,
  me: string,
  limits: Omit<ViewLimits, "now">,
  now: () => number = house.now,
): HousePorts<X> => ({
  me,
  openingNotices: () => [
    ...(house.mindNotices?.() ?? []),
    ...(house.storageNotices?.().length ? [journalTexts.rebuilt] : []),
    ...(house.storageUnsaved?.() ?? []).map(journalTexts.unsavedRecord),
  ],
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
} from "../tools/adapter-contract.ts";

export { maintainHouseCustody, type CustodyMaintenance } from "./house-custody-maintenance.ts";
