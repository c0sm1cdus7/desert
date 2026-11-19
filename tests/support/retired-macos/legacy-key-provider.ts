// Historical migration verifies byte-oriented legacy providers before removing their stored values.
import type { SecretRef } from "../../../src/keychain/custody/custody-contract.ts";
import { CustodyError } from "../../../src/keychain/custody/house-keys.ts";
import type { SecretCustody } from "../../../src/keychain/custody/secret-custody.ts";
/** The owner supplies every source/destination explicitly; KeyStore has no reliable enumeration contract. */
export async function importLegacyKeys(
  custody: SecretCustody,
  source: { get(provider: string): Promise<Uint8Array | undefined>; remove(provider: string): Promise<void> },
  manifest: readonly Readonly<{ provider: string; ref: SecretRef }>[],
): Promise<void> {
  try {
    for (const entry of manifest) {
      const value = await source.get(entry.provider);
      if (value !== undefined) custody.importLegacy(entry.ref, value);
      else custody.verifyLegacy(entry.ref);
    }
    // Every encrypted destination is durable and verified before the first old value is removed.
    for (const entry of manifest) await source.remove(entry.provider);
  } catch {
    throw new CustodyError("E-CUSTODY-LEGACY");
  }
}
