// The host seeds founders lazily; every door resolves and redeems against the live journal projection.
import { credentialEqual } from "../house/doors/credential-equal.ts";
import { scrypt } from "node:crypto";
import {
  findDoorKey,
  doorFingerprint,
  invitationFingerprint,
  issueDoorKey,
  type DoorIdentity,
} from "../house/doors/door-material.ts";
import type { House } from "../house/members.ts";
import type { HouseBus } from "../journal/vocabulary.ts";
import { invitationAttempts } from "./invitation-proof.ts";
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
  redeem: (identity: string, invitation: string, material?: string, oauth?: boolean) => string | undefined,
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
  redeemAction: (identity: string, invitation: string, material?: string, oauth?: boolean) => string | undefined,
) {
  const redeem = createRedeemer(state, now, redeemAction);
  return {
    get(material: string) {
      const house = state();
      const key = findDoorKey(house.doors, material);
      return key && house.grants.has(key.identity) ? key : undefined;
    },
    attempt: invitationAttempts(async (code, material, oauth) => {
      const house = state();
      for (const invitation of house.doors.invitations.values()) {
        if ((!invitation.redeemed && now() >= invitation.expires) || (invitation.redeemed && !material)) continue;
        const fingerprint = await new Promise<string>((resolve, reject) =>
          scrypt(code, `desert-door-invitation:${invitation.id}`, 32, (error, value) =>
            error ? reject(error) : resolve(value.toString("hex")),
          ),
        );
        if (credentialEqual(fingerprint, invitation.fingerprint)) return redeem(code, material, oauth, invitation.id);
      }
      return { status: 400 };
    }, now),
    redeem,
  };
}
function createRedeemer(
  state: () => House,
  now: () => number,
  redeem: (identity: string, invitation: string, material?: string, oauth?: boolean) => string | undefined,
) {
  let redeeming = false;
  return (
    code: string,
    material?: string,
    oauth = false,
    verified?: string,
  ): Readonly<{ status: number; key?: string }> => {
    const at = now();
    if (redeeming) return { status: 400 };
    const house = state();
    const invitation = verified
      ? house.doors.invitations.get(verified)
      : matchingInvitation(house, code, at, material !== undefined);
    if (!invitation || !house.grants.has(invitation.identity)) return { status: 400 };
    if (material && !/^[A-Za-z0-9_-]{43}$/.test(material)) return { status: 400 };
    if (invitation.redeemed) {
      const key = house.doors.keys.get(invitation.key ?? "");
      return material && key && !key.revoked && credentialEqual(key.fingerprint, doorFingerprint(material))
        ? { status: 200, key: material }
        : { status: 400 };
    }
    redeeming = true;
    try {
      const key = now() < invitation.expires ? redeem(invitation.identity, invitation.id, material, oauth) : undefined;
      return key ? { status: 200, key } : { status: 400 };
    } finally {
      redeeming = false;
    }
  };
}
function matchingInvitation(house: House, code: string, at: number, retry = false) {
  return /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(code)
    ? [...house.doors.invitations.values()].find(
        each =>
          (!each.redeemed || retry) &&
          at < each.expires &&
          credentialEqual(each.fingerprint, invitationFingerprint(code, each.id)),
      )
    : undefined;
}
export type DoorAccess = ReturnType<typeof doorAccess>;
