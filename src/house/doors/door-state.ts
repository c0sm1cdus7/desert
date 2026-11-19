// Fold door access and consume invitations without storing any bearer material.
import type { HouseEvent } from "../facts.ts";
import type { House } from "../members.ts";
export type DoorCredential = HouseEvent<"door-key-issued">["data"] & Readonly<{ revoked: boolean }>;
export type DoorInvitation = HouseEvent<"door-invitation-issued">["data"] &
  Readonly<{ redeemed: boolean; key?: string }>;
export type DoorState = Readonly<{
  initialized: boolean;
  keys: ReadonlyMap<string, DoorCredential>;
  invitations: ReadonlyMap<string, DoorInvitation>;
}>;
export const emptyDoors: DoorState = { initialized: false, keys: new Map(), invitations: new Map() };
export function doorStep(house: House, event: HouseEvent): House {
  if (!event.kind.startsWith("door-")) return house;
  const state = house.doors;
  const doors = { ...state, initialized: true };
  if (event.by !== house.admin) return { ...house, doors };
  if (event.kind === "door-key-issued" && house.grants.has(event.data.identity) && !state.keys.has(event.data.id))
    return {
      ...house,
      doors: { ...doors, keys: new Map(state.keys).set(event.data.id, { ...event.data, revoked: false }) },
    };
  if (
    event.kind === "door-invitation-issued" &&
    house.grants.has(event.data.identity) &&
    !state.invitations.has(event.data.id)
  )
    return {
      ...house,
      doors: {
        ...doors,
        invitations: new Map(state.invitations).set(event.data.id, { ...event.data, redeemed: false }),
      },
    };
  if (event.kind === "door-key-revoked") {
    const key = state.keys.get(event.data.key);
    if (key) return { ...house, doors: { ...doors, keys: new Map(state.keys).set(key.id, { ...key, revoked: true }) } };
  }
  if (event.kind === "door-invitation-redeemed") {
    const invitation = state.invitations.get(event.data.invitation);
    if (invitation && !invitation.redeemed && event.at < invitation.expires)
      return {
        ...house,
        doors: {
          ...doors,
          invitations: new Map(state.invitations).set(invitation.id, redeemedInvitation(invitation, event.data.key)),
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
