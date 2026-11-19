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
  if (keys.has(doorFingerprint(text))) return mcpTexts.redacted;
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
  if (state.keys.size === 0 && state.invitations.size === 0) return value;
  const seen = new WeakMap<object, unknown>();
  const visit = (item: unknown): unknown => {
    if (typeof item === "string") return scrubDoorText(item, state);
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return seen.get(item);
    if (item instanceof Map) {
      const copy = new Map<unknown, unknown>();
      seen.set(item, copy);
      for (const [key, child] of item) copy.set(visit(key), visit(child));
      return copy;
    }
    if (item instanceof Set) {
      const copy = new Set<unknown>();
      seen.set(item, copy);
      for (const child of item) copy.add(visit(child));
      return copy;
    }
    if (Array.isArray(item)) {
      const copy: unknown[] = [];
      seen.set(item, copy);
      copy.push(...item.map(visit));
      return copy;
    }
    if (Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null) {
      const copy: Record<string, unknown> = {};
      seen.set(item, copy);
      for (const [key, child] of Object.entries(item)) copy[scrubDoorText(key, state)] = visit(child);
      return copy;
    }
    return item;
  };
  // Preserve the input type while replacing only strings in public JSON-shaped values.
  return visit(value);
}
