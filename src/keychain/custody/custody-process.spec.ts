import { processKeys } from "../../../tests/support/custody-provider.ts";
import { afterEach, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { SecretCustody } from "./secret-custody.ts";
const homes: string[] = [];
afterEach(() => homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true })));
for (const revoked of [false, true])
  it(`recovers after SIGKILL with ${revoked ? "a revoked use in progress" : "a provisional ingress"}`, () => {
    const home = mkdtempSync(join(tmpdir(), "custody-killed-fixture-"));
    homes.push(home);
    const file = join(home, "fixture.sqlite");
    const module = fileURLToPath(new URL("./secret-custody.ts", import.meta.url));
    // A fixed test-only key exists exclusively in process memory. No real provider or keychain runs.
    const providerModule = fileURLToPath(new URL("../../../tests/support/custody-provider.ts", import.meta.url));
    const code = `import { processKeys } from ${JSON.stringify(providerModule)};
      const home = ${JSON.stringify(home)};
      import { SecretCustody } from ${JSON.stringify(module)};
      const store = new SecretCustody(${JSON.stringify(file)}, ${JSON.stringify(home)},
        processKeys(home));
      const session = store.begin({ actor: "ana", tool: "vault", target: "test" });
      const refs = { key: session.capture(Buffer.from("INVENTED_MATERIAL")) };
      if (${String(revoked)}) {
        session.replace("signing", refs, 0);
        store.adapter(session, ["signing"]).use(refs, () => new Promise(() => {}));
        session.release("signing", 1);
      }
      process.kill(process.pid, "SIGKILL");`;
    expect(() =>
      execFileSync(process.execPath, ["--input-type=module", "-e", code], { stdio: ["ignore", "pipe", "pipe"] }),
    ).toThrow(expect.objectContaining({ signal: "SIGKILL" }));
    const recovered = new SecretCustody(file, home, processKeys(home));
    try {
      expect(recovered.ids()).toEqual([]);
      expect(recovered.facts().filter(fact => fact.kind === "credential-purged")).toHaveLength(1);
      expect(recovered.begin({ actor: "ana", tool: "vault", target: "test" }).current("signing")).toBeUndefined();
    } finally {
      recovered.close();
    }
  });
