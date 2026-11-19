// Bind a cloud house's bus to a domain-separated verifier, without retaining its root or changing door ports.
import { hkdfSync, timingSafeEqual } from "node:crypto";
import { oauthTexts } from "../../texts/oauth.texts.ts";
const verifiers = new WeakMap<object, Buffer>();
export const rootVerifier = (root: Uint8Array) =>
  Buffer.from(hkdfSync("sha256", root, "", "desert/house/door-root-verifier/v1", 32));
export function bindDoorRoot(bus: object, verifier: Buffer): void {
  verifiers.set(bus, verifier);
}
export function checkDoorRoot(bus: object, root: Uint8Array | undefined): void {
  const expected = verifiers.get(bus);
  if (!expected || !root) return;
  const supplied = rootVerifier(root);
  try {
    if (!timingSafeEqual(expected, supplied)) throw new Error(oauthTexts.rootMismatch);
  } finally {
    supplied.fill(0);
  }
}
