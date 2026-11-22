// One house running: its journal, its secrets kept apart, its tools listening, its clock, and a boot written last.
import { effect } from "../house/facts.ts";
import { cancelInheritedWake } from "../house/inherited-wake.ts";
import { checkCreation, createHouse, identityReader, InvalidCreation } from "../house/members.ts";
import { startClock, systemTime, type TimeSource } from "../journal/clock.ts";
import { journeyFrozen } from "../house/minds/journey-state.ts";
import type { Event } from "../journal/vocabulary.ts";
import type { HousePorts } from "../surface/bridge/ports/house-ports.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import { defectReporter } from "../tools/failures/defect-reporter.ts";
import type { Program, ViewLimits } from "../tools/tool-contract.ts";
import { deviceRegistrationAccess } from "./devices/device-registration.ts";
import { createDeviceRuntime, type DeviceRuntime } from "./devices/device-runtime.ts";
import { revokeUndeliveredCodes } from "./oauth-recovery.ts";
import { seedDoorKeys } from "./door-access.ts";
import { composed } from "./house-composition.ts";
import { houseResources } from "./house-resources.ts";

import { startState, type HouseOptions } from "../house/state.ts";
import { startTools } from "../tools/start.ts";
import type { MindRuntimeOptions, MindSwitches, ModelHouseOptions } from "./minds/mind-runtime-options.ts";
import type { ModelMinds } from "./minds/mind-runtime.ts";
import type { ActVerdict } from "../tools/minds/mind-review.ts";
/** The supervisor's verdict once the minds start, and whether this run brings one at all. */
type Supervision = { verdict?: ActVerdict | undefined; expected: boolean };

function houseContracts<X extends Program>(options: HouseOptions<X>, resources: ReturnType<typeof houseResources<X>>) {
  const { state, journal } = resources;
  const { slices, by, identities, registry, kitMigration } = options;
  return options.contractSetup?.({
    state,
    registry,
    slices,
    initial: startState(slices, by, identities, registry, kitMigration),
    events: () => houseHistory<X>(journal),
  });
}
export function startHouse<X extends Program>(
  home: string,
  options: ModelHouseOptions<X>,
  time: TimeSource = systemTime,
) {
  options = composed(options);
  const { by, registry, creation } = options;
  const { supervision, ports } = engineChoices(options);
  const resources = houseResources(home, options, time);
  const { protection, secrets, bus, stops, report, close, state, clock } = resources;
  try {
    if (!state().house.admin) checkCreation(creation, by);
    protection.mark();
    protection.attach(secrets, state);
    const contracts = houseContracts(options, resources);
    const devices = createDeviceRuntime(
      bus,
      () => state().house,
      registry,
      by,
      value => secrets.scrub(value),
    );
    stops.push(() => devices.close());
    const tools = startHouseTools(options, resources, ports, devices, contracts, time);
    if (!state().house.admin) createHouse(bus, creation);
    seedDoorKeys(bus, () => state().house, options.founderDoorKeys);
    revokeUndeliveredCodes(bus, () => state().house);
    stops.push(tools.stop, startClock(bus, time, clock(), by));
    // The boot says whether this run brings a supervisor: what happens in a run without one never wakes it (21/11).
    bus.emit(effect("boot", supervision.expected ? { supervised: true } : {}, by));
    const minds = loadMinds(home, options, time, resources, devices, contracts, supervision);
    return runningHouse(home, registry, tools, time, resources, devices, minds);
  } catch (error) {
    if (!(error instanceof InvalidCreation)) report(error, "program", "program", "start");
    close();
    throw error;
  }
}
/** The program's own acts and processes, and the supervisor's verdict on a marked act of an identity, which the
 * minds fill in when they start, after the house: until then a run that brings a supervisor says it is starting. */
function engineChoices<X extends Program>(options: ModelHouseOptions<X>) {
  const switches = options.minds;
  const minds = !!switches && (switches.assistants || switches.programs.length > 0);
  const supervision: Supervision = { expected: minds && options.modelMinds?.supervisorCard !== undefined };
  const ports = {
    ...(options.own ? { own: options.own } : {}),
    ...(options.process ? { process: options.process } : {}),
    supervisor: () => supervision.verdict ?? (supervision.expected ? ("starting" as const) : undefined),
  };
  return { supervision, ports };
}
function startHouseTools<X extends Program>(
  options: HouseOptions<X>,
  resources: ReturnType<typeof houseResources<X>>,
  ports: Partial<Pick<import("../tools/execute.ts").Execution<X>, "own" | "process" | "supervisor">>,
  devices: DeviceRuntime,
  contracts: import("../tools/contract-port.ts").ContractFactory | undefined,
  time: TimeSource,
) {
  const { capabilities, state, bus, secrets, journal } = resources;
  const { registry } = options;
  return startTools({
    devices: devices.dispatch,
    ...(contracts ? { contracts } : {}),
    ...ports,
    ...capabilities(state),
    bus,
    secrets,
    registry,
    history: houseHistory<X>(journal),
    state,
    now: () => time.now(),
  });
}
function runningHouse<X extends Program>(
  home: string,
  registry: HouseOptions<X>["registry"],
  tools: ReturnType<typeof startTools<X>>,
  time: TimeSource,
  resources: ReturnType<typeof houseResources<X>>,
  devices: DeviceRuntime,
  { ready, notices: mindNotices, bankMinds }: ReturnType<typeof loadMinds<X>>,
) {
  const { bus, journal, close, notices, state } = resources;
  const { dispatch: _dispatch, ...deviceAccess } = devices;
  return {
    home,
    bus,
    journal,
    tools,
    devices: { ...deviceAccess, ...deviceRegistrationAccess(tools) },
    registry,
    close,
    ...(ready ? { minds: ready } : {}),
    storageNotices: notices.read,
    ...(mindNotices ? { mindNotices } : {}),
    storageUnsaved: notices.unsaved,
    now: () => time.now(),
    cancelInheritedWake: (by: string, id: string) => cancelInheritedWake(state, bus, by, id),
    bankMinds,
  };
}
/** The minds give the verdict when they start; once they stop, or start with no supervisor, nothing is starting. */
function supervise(supervision: Supervision, verdict: Supervision["verdict"]) {
  supervision.verdict = verdict;
  supervision.expected = verdict !== undefined;
}
function mindHouse<X extends Program>(
  home: string,
  options: ModelHouseOptions<X>,
  time: TimeSource,
  resources: ReturnType<typeof houseResources<X>>,
  active: () => boolean,
  devices: DeviceRuntime,
  contracts?: import("../tools/contract-port.ts").ContractFactory,
  supervision?: Supervision,
) {
  const { capabilities, state, bus, secrets, journal, report, close } = resources;
  const history = rememberedHistory<X["fact"]>(journal, bus);
  return {
    home,
    time,
    active,
    ...(supervision ? { supervise: (verdict: Supervision["verdict"]) => supervise(supervision, verdict) } : {}),
    execution: {
      devices: devices.dispatch,
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
        return !!journey && !journey.closed && !journeyFrozen(journey) && (by === undefined || journey.by === by);
      },
    },
    history,
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
  devices: DeviceRuntime,
  contracts: import("../tools/contract-port.ts").ContractFactory | undefined,
  supervision: Supervision,
) {
  const switches = options.minds;
  const config = options.modelMinds;
  const bankMinds = mindBank(home, options, time, resources, devices, contracts);
  if (!switches || !(switches.assistants || switches.programs.length) || !config) return { bankMinds };
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
      const house = mindHouse(home, options, time, resources, () => active, devices, contracts, supervision);
      const { prepareProgramMinds } = await import("./minds/program-mind-prepare.ts");
      const { fundModelMinds } = await import("./minds/model-spending-account.ts");
      if (!houseActive()) return undefined;
      const prepared = await prepareProgramMinds(house, fundModelMinds(home, config, resources.stops), switches);
      if (!houseActive()) return undefined;
      minds = startModelMinds(house, switches, prepared);
      return minds;
    })
    .catch((error: unknown) => {
      resources.close();
      throw error;
    });
  return { ready, notices: () => minds?.notices() ?? [], bankMinds };
}
/** Composes the card catalog offline against this open house: each enabled program mind runs its cases through the
 * bank, which records its evidence and assigns a passing card when none is assigned. Opening never calls it. */
function mindBank<X extends Program>(
  home: string,
  options: ModelHouseOptions<X>,
  time: TimeSource,
  resources: ReturnType<typeof houseResources<X>>,
  devices: DeviceRuntime,
  contracts?: import("../tools/contract-port.ts").ContractFactory,
) {
  let open = true;
  resources.stops.unshift(() => {
    open = false;
  });
  return async (models: MindRuntimeOptions, switches: MindSwitches) => {
    const { runProgramBank } = await import("./minds/program-mind-bank.ts");
    const house = mindHouse(home, options, time, resources, () => open, devices, contracts);
    return runProgramBank(house, models, switches);
  };
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
  state: identityReader(house.tools.state, me),
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
import { rememberedHistory } from "./remembered-history.ts";

function houseHistory<X extends Program>(journal: ReturnType<typeof houseResources<X>>["journal"]) {
  return journal.replay<Event<X["fact"]>[]>([], (events, event) => {
    events.push(event);
    return events;
  });
}
