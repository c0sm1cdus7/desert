// Generate unpredictable bearer material and compare only its domain-separated fingerprint.
import { createHash, randomBytes, randomUUID, randomInt, scryptSync } from "node:crypto";
import { mcpTexts } from "../../texts/mcp.texts.ts";
import { effect } from "../facts.ts";
import type { DoorState } from "./door-state.ts";
export type DoorIdentity = Readonly<{ identity: string; door: "agent" | "terminal"; id?: string }>;
export const doorFingerprint = (material: string) =>
  createHash("sha256").update(`desert-door-key:${material}`).digest("hex");
export const invitationFingerprint = (material: string, id: string) =>
  scryptSync(material, `desert-door-invitation:${id}`, 32).toString("hex");
export function issueInvitation(identity: string, door: DoorIdentity["door"], by: string, at: number) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letters = Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join("");
  const code = `${letters.slice(0, 4)}-${letters.slice(4)}`;
  const id = randomUUID();
  const data = {
    id,
    identity,
    door,
    fingerprint: invitationFingerprint(code, id),
    expires: at + 86_400_000,
  };
  return { code, fact: effect("door-invitation-issued", data, by) };
}
export function issueDoorKey(
  identity: string,
  door: DoorIdentity["door"],
  by: string,
  material = randomBytes(32).toString("base64url"),
) {
  return {
    material,
    fact: effect("door-key-issued", { id: randomUUID(), identity, door, fingerprint: doorFingerprint(material) }, by),
  };
}
export function findDoorKey(state: DoorState, material: string) {
  const fingerprint = doorFingerprint(material);
  return [...state.keys.values()].find(key => !key.revoked && key.fingerprint === fingerprint);
}
/** Scrub known material even when a caller pastes it back into an ordinary public field. */
export function scrubDoorText(text: string, state: DoorState): string {
  const keys = new Set([...state.keys.values()].map(key => key.fingerprint));
  const invitations = [...state.invitations.values()];
  return text.replace(/[A-Za-z0-9_+-]{8,}={0,2}/g, token =>
    keys.has(doorFingerprint(token)) ||
    (/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(token) &&
      invitations.some(invitation => invitation.fingerprint === invitationFingerprint(token, invitation.id)))
      ? mcpTexts.redacted
      : token,
  );
}
export function scrubDoorValue<T>(value: T, state: DoorState): T;
export function scrubDoorValue(value: unknown, state: DoorState): unknown {
  const visit = (item: unknown): unknown => {
    if (typeof item === "string") return scrubDoorText(item, state);
    if (Array.isArray(item)) return item.map(visit);
    if (
      item &&
      typeof item === "object" &&
      (Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null)
    )
      return Object.fromEntries(Object.entries(item).map(([key, child]) => [scrubDoorText(key, state), visit(child)]));
    return item;
  };
  // Preserve the input type while replacing only strings in public JSON-shaped values.
  return visit(value);
}
