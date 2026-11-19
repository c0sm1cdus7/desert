// Adapt legacy founder maps once; authentication always reads the house's current fingerprint state.
import type { DoorIdentity } from "../../../house/doors/door-material.ts";
import { doorAccess, seedDoorKeys, type DoorBus } from "../../../runtime/door-access.ts";
import { doorTexts } from "../../../texts/doors.texts.ts";
import type { startTools } from "../../../tools/start.ts";
import type { Program } from "../../../tools/tool-contract.ts";
export function liveDoorKeys<X extends Program>(
  house: Readonly<{ bus: DoorBus; tools: Pick<ReturnType<typeof startTools<X>>, "state" | "act">; now: () => number }>,
  founders?: ReadonlyMap<string, DoorIdentity>,
) {
  if (founders && !house.tools.state().house.doors.initialized)
    seedDoorKeys(house.bus, () => house.tools.state().house, {
      read: () => new Map([...founders].filter(([, key]) => house.tools.state().house.grants.has(key.identity))),
      present: () => founders.size > 0,
    });
  return doorAccess(
    house.bus,
    () => house.tools.state().house,
    house.now,
    (identity, invitation) => {
      const by = house.tools.state().house.admin;
      const target = `identities/${identity}`;
      house.tools.act({ act: "attend", input: { target } }, 0, by);
      const result = house.tools.act(
        { act: "redeem-invitation", target, input: { invitation } },
        house.tools.state().through,
        by,
      );
      if (result.status !== "processing" && result.defect) throw new Error(doorTexts.denied);
      return result.status === "accepted" ? result.private : undefined;
    },
  );
}
