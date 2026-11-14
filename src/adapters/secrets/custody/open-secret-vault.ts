import type { CredentialLedger } from "./custody-contract.ts";
import type { TSchema } from "@sinclair/typebox";
import type { Program } from "../../../tools/tool-contract.ts";
import type { HouseKeyProvider } from "./house-keys.ts";
import { SecretVault } from "../secret-vault.ts";
export function openSecretVault<X extends Program>(
  file: string,
  journal: TSchema,
  keys: HouseKeyProvider | undefined,
  failed: () => void,
  ledger?: CredentialLedger,
): SecretVault<X> {
  try {
    ledger?.facts();
    return new SecretVault<X>(file, journal, keys, ledger);
  } catch (error) {
    failed();
    throw error;
  }
}

export { maintainCustody } from "./custody-maintenance.ts";
