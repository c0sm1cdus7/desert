// Fold door access and consume invitations without storing any bearer material.
import type { HouseEvent } from "../facts.ts";
import type { House } from "../members.ts";
export type DoorCredential = HouseEvent<"door-key-issued">["data"] & Readonly<{ revoked: boolean }>;
export type DoorInvitation = HouseEvent<"door-invitation-issued">["data"] &
  Readonly<{ redeemed: boolean; key?: string }>;
export type DoorOAuthCode = Readonly<{ fingerprint: string; key: string; delivered: boolean }>;
export type DoorState = Readonly<{
  initialized: boolean;
  codes: ReadonlyMap<string, DoorOAuthCode>;
  keys: ReadonlyMap<string, DoorCredential>;
  invitations: ReadonlyMap<string, DoorInvitation>;
}>;
export const emptyDoors: DoorState = { initialized: false, codes: new Map(), keys: new Map(), invitations: new Map() };
export function doorStep(house: House, event: HouseEvent): House {
  if (!event.kind.startsWith("door-")) return house;
  const doors = { ...house.doors, initialized: true };
  if (event.by !== house.admin) return { ...house, doors };
  if (event.kind === "door-oauth-issued" || event.kind === "door-oauth-delivered")
    return { ...house, doors: oauthStep(doors, event) };
  if (event.kind === "door-key-issued" && house.grants.has(event.data.identity) && !doors.keys.has(event.data.id))
    return {
      ...house,
      doors: { ...doors, keys: new Map(doors.keys).set(event.data.id, { ...event.data, revoked: false }) },
    };
  if (
    event.kind === "door-invitation-issued" &&
    house.grants.has(event.data.identity) &&
    !doors.invitations.has(event.data.id)
  )
    return {
      ...house,
      doors: {
        ...doors,
        invitations: new Map(doors.invitations).set(event.data.id, { ...event.data, redeemed: false }),
      },
    };
  if (event.kind === "door-key-revoked") {
    const key = doors.keys.get(event.data.key);
    if (key) return { ...house, doors: { ...doors, keys: new Map(doors.keys).set(key.id, { ...key, revoked: true }) } };
  }
  if (event.kind === "door-invitation-redeemed") {
    const invitation = doors.invitations.get(event.data.invitation);
    if (invitation && !invitation.redeemed && event.at < invitation.expires)
      return {
        ...house,
        doors: {
          ...doors,
          invitations: new Map(doors.invitations).set(invitation.id, redeemedInvitation(invitation, event.data.key)),
        },
      };
  }
  return { ...house, doors };
}

const redeemedInvitation = (invitation: DoorInvitation, key: string): DoorInvitation => ({
  ...invitation,
  redeemed: true,
  key,
});

function oauthStep(state: DoorState, event: HouseEvent): DoorState {
  if (event.kind === "door-oauth-issued" && state.keys.has(event.data.key) && !state.codes.has(event.data.fingerprint))
    return { ...state, codes: new Map(state.codes).set(event.data.fingerprint, { ...event.data, delivered: false }) };
  if (event.kind === "door-oauth-delivered") {
    const code = state.codes.get(event.data.fingerprint);
    if (code) return { ...state, codes: new Map(state.codes).set(code.fingerprint, { ...code, delivered: true }) };
  }
  return state;
}
