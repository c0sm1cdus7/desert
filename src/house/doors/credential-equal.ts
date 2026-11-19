// Compare fixed-size digests even when untrusted material has an unexpected length or encoding.
import { createHash, timingSafeEqual } from "node:crypto";
export function credentialEqual(left: string, right: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(left), digest(right));
}
