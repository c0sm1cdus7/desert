import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { declaredAdapters } from "../adapters/compose-adapters.ts";
import type { AdapterComposition } from "../tools/adapter-contract.ts";
import { SecretCustody } from "../keychain/custody/secret-custody.ts";
import { MemoryHouseKeys } from "../keychain/custody/house-keys.ts";
import type { CredentialScope } from "../tools/capabilities-contract.ts";
/** Synthetic material only. Runs real declaration, permission, schema and revocation checks, with no external provider.
 * The adapter supplied by the test must inject fake transports; this helper does not sandbox its code. */
export function adapterTest(
  composition: AdapterComposition,
  scope: CredentialScope,
  material: Readonly<Record<string, string>>,
) {
  const declared = declaredAdapters(composition, Object.keys(composition.credentialSlots ?? { [scope.tool]: [] }));
  const home = mkdtempSync(join(tmpdir(), "adapter-test-"));
  let custody: SecretCustody | undefined;
  try {
    custody = new SecretCustody(join(home, "fixture.sqlite"), home, new MemoryHouseKeys());
    const opened = custody;
    const lease = declared(opened, () => true)(scope);
    const refs = Object.fromEntries(Object.entries(material).map(([name, value]) => [name, lease.capture(value)]));
    let closed = false;
    return {
      refs,
      ports: lease.ports,
      close: () => {
        if (closed) return;
        closed = true;
        try {
          lease.close();
        } finally {
          opened.close();
          rmSync(home, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    custody?.close();
    rmSync(home, { recursive: true, force: true });
    throw error;
  }
}

export { MemoryHouseKeys, type HouseKeyProvider } from "../keychain/custody/house-keys.ts";
