// Validate public registration material without opening a device or touching private credentials.
import { createPublicKey } from "node:crypto";
export function validDevicePublicKey(value: string): boolean {
  try {
    return (
      createPublicKey({ key: Buffer.from(value, "base64"), type: "spki", format: "der" }).asymmetricKeyType ===
      "ed25519"
    );
  } catch {
    return false;
  }
}
