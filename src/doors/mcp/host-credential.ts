// Derive the host's bearer independently of all journal credentials and compare fixed-size digests.
import { meant } from "../../fields/phrases.ts";
import { createHash, hkdfSync, timingSafeEqual } from "node:crypto";
import type { DoorAccess } from "../../runtime/door-access.ts";
import { protectDoorMaterial } from "../../house/doors/volatile-door-material.ts";
import { oauthTexts } from "../../texts/oauth.texts.ts";
export function deriveHostCredential(rootKey: Uint8Array): string {
  if (rootKey.byteLength < 32) throw new Error(meant(oauthTexts.configuration));
  return Buffer.from(hkdfSync("sha256", rootKey, "", "desert/door/host/v1", 32)).toString("base64url");
}
export function hostDoorAccess(access: DoorAccess, rootKey: Uint8Array | undefined, admin: () => string): DoorAccess {
  if (!rootKey) return access;
  const credential = deriveHostCredential(rootKey);
  protectDoorMaterial(credential);
  const expected = createHash("sha256").update(credential).digest();
  return {
    ...access,
    get: material => {
      if (!timingSafeEqual(expected, createHash("sha256").update(material).digest())) return access.get(material);
      const identity = admin();
      return {
        identity,
        door: "terminal",
        id: `host:${expected.toString("hex")}`,
        fingerprint: expected.toString("hex"),
        revoked: false,
        live: () => admin() === identity,
      };
    },
  };
}
