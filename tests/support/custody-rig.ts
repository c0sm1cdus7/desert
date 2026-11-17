import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, vi } from "vitest";
import { SecretCustody } from "../../src/keychain/custody/secret-custody.ts";
import { MemoryHouseKeys, type HouseKeyProvider } from "../../src/keychain/custody/house-keys.ts";
import type { CredentialFact, CredentialLedger } from "../../src/keychain/custody/custody-contract.ts";
const homes: string[] = [];
const opened: SecretCustody[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  opened.splice(0).forEach(store => store.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
export const custodyScope = { actor: "ana", tool: "vault", target: "organization:test" };
export function custodyRig(createKeys: (home: string) => HouseKeyProvider = () => new MemoryHouseKeys()) {
  const home = mkdtempSync(join(tmpdir(), "custody-fixture-"));
  homes.push(home);
  const file = join(home, "fixture.sqlite"),
    keys = createKeys(home);
  const open = (ledger?: CredentialLedger) => {
    const store = new SecretCustody(file, home, keys, ledger);
    opened.push(store);
    return store;
  };
  return { file, home, keys, open };
}

export const custodyHead = (facts: readonly CredentialFact[]) => ({
  count: facts.length,
  authentication: facts.at(-1)?.authentication ?? "",
});
