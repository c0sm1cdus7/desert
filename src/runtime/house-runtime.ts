// One house running: its journal, its secrets kept apart, its tools listening, its clock, and a boot written last.
import { effect } from "../house/facts.ts";
import { cancelInheritedWake } from "../house/inherited-wake.ts";
import { checkCreation, createHouse, identityReader, InvalidCreation } from "../house/members.ts";
import { startClock, systemTime, type TimeSource } from "../journal/clock.ts";
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
import type { ModelHouseOptions } from "./minds/mind-runtime-options.ts";
import type { ModelMinds } from "./minds/mind-runtime.ts";

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
  const ports = {
    ...(options.own ? { own: options.own } : {}),
    ...(options.process ? { process: options.process } : {}),
  };
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
    bus.emit(effect("boot", {}, by));
    const minds = loadMinds(home, options, time, resources, devices, contracts);
    return runningHouse(home, registry, tools, time, resources, devices, minds?.ready, minds?.notices);
  } catch (error) {
    if (!(error instanceof InvalidCreation)) report(error, "program", "program", "start");
    close();
    throw error;
  }
}
function startHouseTools<X extends Program>(
  options: HouseOptions<X>,
  resources: ReturnType<typeof houseResources<X>>,
  ports: Partial<Pick<import("../tools/execute.ts").Execution<X>, "own" | "process">>,
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
  ready?: Promise<ModelMinds | undefined>,
  mindNotices?: () => readonly string[],
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
  };
}
function mindHouse<X extends Program>(
  home: string,
  options: ModelHouseOptions<X>,
  time: TimeSource,
  resources: ReturnType<typeof houseResources<X>>,
  active: () => boolean,
  devices: DeviceRuntime,
  contracts?: import("../tools/contract-port.ts").ContractFactory,
) {
  const { capabilities, state, bus, secrets, journal, report, close } = resources;
  return {
    home,
    time,
    active,
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
        return !!journey && !journey.closed && (by === undefined || journey.by === by);
      },
    },
    history: () => houseHistory<X>(journal),
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
      const house = mindHouse(home, options, time, resources, () => active, devices, contracts);
      const { prepareProgramMinds } = await import("./minds/program-mind-bank.ts");
      const { fundModelMinds } = await import("./minds/model-spending-account.ts");
      const { publishMindCards } = await import("./minds/mind-card-catalog.ts");
      if (!houseActive()) return undefined;
      const funded = fundModelMinds(home, config, resources.stops);
      publishMindCards(house, funded, true);
      const prepared = await prepareProgramMinds(house, funded, switches);
      publishMindCards(house, prepared);
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

function houseHistory<X extends Program>(journal: ReturnType<typeof houseResources<X>>["journal"]) {
  return journal.replay<Event<X["fact"]>[]>([], (events, event) => {
    events.push(event);
    return events;
  });
}
