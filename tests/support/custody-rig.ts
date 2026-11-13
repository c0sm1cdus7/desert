import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, vi } from "vitest";
import { SecretCustody } from "../../src/adapters/secrets/custody/secret-custody.ts";
import { MemoryHouseKeys } from "../../src/adapters/secrets/custody/house-keys.ts";
import type { CredentialLedger } from "../../src/adapters/secrets/custody/custody-contract.ts";
const homes: string[] = [];
const opened: SecretCustody[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  opened.splice(0).forEach(store => store.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
export const custodyScope = { actor: "ana", tool: "vault", target: "organization:test" };
export function custodyRig() {
  const home = mkdtempSync(join(tmpdir(), "custody-fixture-"));
  homes.push(home);
  const file = join(home, "fixture.sqlite"),
    keys = new MemoryHouseKeys();
  const open = (ledger?: CredentialLedger) => {
    const store = new SecretCustody(file, home, keys, ledger);
    opened.push(store);
    return store;
  };
  return { file, home, keys, open };
}
