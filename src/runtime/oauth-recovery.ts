// At opening, revoke OAuth keys without durable delivery, including a death before the code digest was recorded.
import { effect } from "../house/facts.ts";
import type { House } from "../house/members.ts";
import type { DoorBus } from "./door-access.ts";
export function revokeUndeliveredCodes(bus: DoorBus, state: () => House): void {
  const house = state();
  const delivered = new Set([...house.doors.codes.values()].filter(code => code.delivered).map(code => code.key));
  const pending = new Set([...house.doors.codes.values()].filter(code => !code.delivered).map(code => code.key));
  for (const key of house.doors.keys.values()) if (key.oauth && !delivered.has(key.id)) pending.add(key.id);
  bus.together(() => {
    for (const key of pending)
      if (house.doors.keys.get(key)?.revoked === false) bus.emit(effect("door-key-revoked", { key }, house.admin));
  });
}
