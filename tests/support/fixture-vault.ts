// House integration tests use a synthetic database without changing custody or its storage implementation.
import { vi } from "vitest";
import { dirname, join } from "node:path";
import type { TSchema } from "@sinclair/typebox";
import type { Program } from "../../src/tools/tool-contract.ts";
import type { HouseKeyProvider } from "../../src/adapters/secrets/custody/house-keys.ts";
import type { CredentialLedger } from "../../src/adapters/secrets/custody/custody-contract.ts";
vi.mock("../../src/adapters/secrets/custody/open-secret-vault.ts", async importOriginal => {
  const actual = await importOriginal<typeof import("../../src/adapters/secrets/custody/open-secret-vault.ts")>();
  return {
    maintainCustody: (
      file: string,
      ...args: Parameters<typeof actual.maintainCustody> extends [string, ...infer R] ? R : never
    ) => actual.maintainCustody(join(dirname(file), "fixture.sqlite"), ...args),
    openSecretVault: <X extends Program>(
      file: string,
      schema: TSchema,
      keys: HouseKeyProvider | undefined,
      failed: () => void,
      ledger?: CredentialLedger,
    ) => actual.openSecretVault<X>(join(dirname(file), "fixture.sqlite"), schema, keys, failed, ledger),
  };
});
