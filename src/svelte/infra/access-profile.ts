import type { HumanIdentity } from "../../identity/contract.ts";
import { identityAvatarSeed } from "./avatar-seed.ts";

export type AccessProfile = Readonly<{ login: string; displayName: string; avatarSeed: string }>;
const key = "desert.access-profile/1";
/** Presentation only: no session, role, credential, object content or authorization. */
export function accessProfile(value: unknown): AccessProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 3 || typeof input.login !== "string" || !/^[a-z][a-z0-9._-]{2,63}$/.test(input.login)
    || typeof input.displayName !== "string" || !input.displayName.trim() || input.displayName.length > 200
    || typeof input.avatarSeed !== "string" || !/^[a-f0-9]{16}$/.test(input.avatarSeed)) return null;
  return { login: input.login, displayName: input.displayName, avatarSeed: input.avatarSeed };
}
export function rememberAccessProfile(identity: HumanIdentity): void {
  const value = accessProfile({ login: identity.login, displayName: identity.displayName,
    avatarSeed: identity.avatarSeed ?? identityAvatarSeed(identity.id) });
  if (!value) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* A portrait never controls access. */ }
}
export function readAccessProfile(): AccessProfile | null {
  try { return accessProfile(JSON.parse(localStorage.getItem(key) ?? "null")); } catch { return null; }
}
