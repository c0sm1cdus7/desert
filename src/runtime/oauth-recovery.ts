// At house opening no pending OAuth bearer can still be delivered: revoke it before serving any door.
import { effect } from "../house/facts.ts";
import type { House } from "../house/members.ts";
import type { DoorBus } from "./door-access.ts";
export function revokeUndeliveredCodes(bus: DoorBus, state: () => House): void {
  const house = state();
  bus.together(() => {
    for (const code of house.doors.codes.values())
      if (!code.delivered && house.doors.keys.get(code.key)?.revoked === false)
        bus.emit(effect("door-key-revoked", { key: code.key }, house.admin));
  });
}
