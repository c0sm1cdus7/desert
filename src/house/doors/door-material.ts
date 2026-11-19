// Generate unpredictable bearer material and compare only its domain-separated fingerprint.
import { scrubVolatileDoorText } from "./volatile-door-material.ts";
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
    fact: effect(
      "door-key-issued",
      { id: randomUUID(), identity, door, fingerprint: doorFingerprint(material), length: material.length },
      by,
    ),
  };
}
export function findDoorKey(state: DoorState, material: string) {
  const fingerprint = doorFingerprint(material);
  const key = [...state.keys.values()].find(key => !key.revoked && key.fingerprint === fingerprint);
  if (key) rememberLength(fingerprint, material.length);
  return key;
}
/** Scrub known material even when a caller pastes it back into an ordinary public field. */
export function scrubDoorText(text: string, state: DoorState): string {
  text = scrubVolatileDoorText(text);
  const index = doorTextIndex(state);
  const fingerprint = doorFingerprint(text);
  if (index.keys.has(fingerprint)) {
    recordMatch(index, fingerprint, text.length);
    return mcpTexts.redacted;
  }
  if (index.ordinary.has(fingerprint)) return text;
  let covered: Uint8Array | undefined;
  const checked = new Map<string, string>();
  // Older facts did not record length: exhaustively compare windows rather than guess their alphabet or size.
  const lengths = index.unknown.size ? Array.from({ length: text.length }, (_, i) => i + 1) : index.lengths;
  for (const length of lengths) {
    if (!index.unknown.size && !index.lengths.has(length)) continue;
    for (let start = 0; start + length <= text.length; start++) {
      const candidate = text.slice(start, start + length);
      const matches = checked.get(candidate) ?? matchingFingerprint(candidate, index.keys);
      // Repeated windows share one comparison; this bounded scratch map dies with the call.
      if (candidate.length <= 1024 && checked.size < 4096) checked.set(candidate, matches);
      if (matches) {
        recordMatch(index, matches, length);
        covered ??= new Uint8Array(text.length);
        covered.fill(1, start, start + length);
      }
    }
  }
  let clean = replaceCovered(text, covered);
  clean = clean.replace(/[A-Za-z0-9_+-]{8,}={0,2}/g, token =>
    /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(token) &&
    [...state.invitations.values()].some(
      invitation => invitation.fingerprint === invitationFingerprint(token, invitation.id),
    )
      ? mcpTexts.redacted
      : token,
  );
  // Retain only hashes of unchanged public text, never the text or a matched credential.
  if (index.ordinary.size >= 65536) index.ordinary.clear();
  if (!covered && clean === text) index.ordinary.add(fingerprint);
  return clean;
}
function replaceCovered(text: string, covered: Uint8Array | undefined) {
  if (!covered) return text;
  let clean = "";
  for (let i = 0; i < text.length; i++) {
    if (!covered[i]) clean += text.charAt(i);
    else if (i === 0 || !covered[i - 1]) clean += mcpTexts.redacted;
  }
  return clean;
}
// A proven length is public metadata; no credential material survives the comparison.
const observedLengths = new Map<string, number>();
function rememberLength(fingerprint: string, length: number) {
  if (observedLengths.size >= 4096 && !observedLengths.has(fingerprint)) observedLengths.clear();
  observedLengths.set(fingerprint, length);
}
function recordMatch(index: ReturnType<typeof makeDoorTextIndex>, fingerprint: string, length: number) {
  rememberLength(fingerprint, length);
  index.unknown.delete(fingerprint);
  index.lengths.add(length);
}
function matchingFingerprint(text: string, keys: ReadonlySet<string>) {
  const fingerprint = doorFingerprint(text);
  return keys.has(fingerprint) ? fingerprint : "";
}
const textIndexes = new WeakMap<DoorState, ReturnType<typeof makeDoorTextIndex>>();
function makeDoorTextIndex(state: DoorState) {
  const keys = [...state.keys.values()];
  return {
    keys: new Set(keys.map(key => key.fingerprint)),
    lengths: new Set(
      keys.flatMap(key => {
        const length = key.length ?? observedLengths.get(key.fingerprint);
        return length === undefined ? [] : [length];
      }),
    ),
    unknown: new Set(
      keys.filter(key => key.length === undefined && !observedLengths.has(key.fingerprint)).map(key => key.fingerprint),
    ),
    ordinary: new Set<string>(),
  };
}
function doorTextIndex(state: DoorState) {
  let index = textIndexes.get(state);
  if (!index) {
    index = makeDoorTextIndex(state);
    textIndexes.set(state, index);
  }
  for (const fingerprint of index.unknown) {
    const length = observedLengths.get(fingerprint);
    if (length !== undefined) {
      index.unknown.delete(fingerprint);
      index.lengths.add(length);
    }
  }
  return index;
}

export function scrubDoorValue<T>(value: T, state: DoorState): T;
export function scrubDoorValue(value: unknown, state: DoorState): unknown {
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
