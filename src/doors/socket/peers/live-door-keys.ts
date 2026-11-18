// Adapt legacy founder maps once; authentication always reads the house's current fingerprint state.
import { seedDoorKeys, doorAccess, type DoorBus } from "../../../runtime/door-access.ts";
import type { House } from "../../../house/members.ts";
import type { DoorIdentity } from "../../../house/doors/door-material.ts";
export function liveDoorKeys(
  house: Readonly<{ bus: DoorBus; tools: { state: () => { house: House } }; now: () => number }>,
  founders?: ReadonlyMap<string, DoorIdentity>,
) {
  if (founders && !house.tools.state().house.doors.initialized)
    seedDoorKeys(house.bus, () => house.tools.state().house, {
      read: () => new Map([...founders].filter(([, key]) => house.tools.state().house.grants.has(key.identity))),
      present: () => founders.size > 0,
    });
  return doorAccess(house.bus, () => house.tools.state().house, house.now);
}
