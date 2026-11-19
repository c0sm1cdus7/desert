// The host seeds founders lazily; every door resolves and redeems against the live journal projection.
import { findDoorKey, invitationFingerprint, issueDoorKey, type DoorIdentity } from "../house/doors/door-material.ts";
import type { House } from "../house/members.ts";
import type { HouseBus } from "../journal/vocabulary.ts";
import { doorTexts } from "../texts/doors.texts.ts";
export type DoorBus = HouseBus & Readonly<{ together: <T>(write: () => T) => T }>;
const accesses = new WeakMap<object, ReturnType<typeof createDoorAccess>>();
export type FounderDoorKeys = Readonly<{
  read: () => ReadonlyMap<string, DoorIdentity>;
  present: () => boolean;
  warn?: (message: string) => void;
}>;
export function seedDoorKeys(bus: DoorBus, state: () => House, founders?: FounderDoorKeys): void {
  if (!founders) return;
  if (state().doors.initialized) {
    if (founders.present())
      (
        founders.warn ??
        (message => {
          process.stderr.write(`${message}\n`);
        })
      )(doorTexts.foundersIgnored);
    return;
  }
  const entries = [...founders.read()];
  if (entries.some(([material, key]) => !material || !state().grants.has(key.identity)))
    throw new Error(doorTexts.invalidFounders);
  bus.together(() => {
    for (const [material, { identity, door }] of entries)
      bus.emit(issueDoorKey(identity, door, state().admin, material).fact);
  });
}
export function doorAccess(
  bus: DoorBus,
  state: () => House,
  now: () => number,
  redeem: (identity: string, invitation: string) => string | undefined,
) {
  const existing = accesses.get(bus);
  if (existing) return existing;
  const access = createDoorAccess(state, now, redeem);
  accesses.set(bus, access);
  return access;
}
function createDoorAccess(
  state: () => House,
  now: () => number,
  redeem: (identity: string, invitation: string) => string | undefined,
) {
  // A house-wide limit also bounds attacks spread over connections or forged forwarding headers.
  let window = now();
  let attempts = 0;
  let redeeming = false;
  return {
    get(material: string) {
      const house = state();
      const key = findDoorKey(house.doors, material);
      return key && house.grants.has(key.identity) ? key : undefined;
    },
    redeem(code: string): Readonly<{ status: number; key?: string }> {
      const at = now();
      if (at >= window + 60_000) {
        window = at;
        attempts = 0;
      }
      if (++attempts > 10) return { status: 429 };
      if (redeeming) return { status: 400 };
      const house = state();
      const invitation = matchingInvitation(house, code, at);
      if (!invitation || !house.grants.has(invitation.identity)) return { status: 400 };
      redeeming = true;
      try {
        const key = now() < invitation.expires ? redeem(invitation.identity, invitation.id) : undefined;
        return key ? { status: 200, key } : { status: 400 };
      } finally {
        redeeming = false;
      }
    },
  };
}
function matchingInvitation(house: House, code: string, at: number) {
  return /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(code)
    ? [...house.doors.invitations.values()].find(
        each => !each.redeemed && at < each.expires && each.fingerprint === invitationFingerprint(code, each.id),
      )
    : undefined;
}
export type DoorAccess = ReturnType<typeof doorAccess>;
