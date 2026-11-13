import { afterEach, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { SecretCustody } from "./custody/secret-custody.ts";
const homes: string[] = [];
afterEach(() => homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true })));
for (const revoked of [false, true])
  it(`recupera tras SIGKILL con ${revoked ? "uso revocado en curso" : "ingreso provisional"}`, () => {
    const home = mkdtempSync(join(tmpdir(), "custody-killed-fixture-"));
    homes.push(home);
    const file = join(home, "fixture.sqlite");
    const module = fileURLToPath(new URL("./custody/secret-custody.ts", import.meta.url));
    // A fixed test-only key exists exclusively in process memory. No real provider or keychain runs.
    const code = `import { SecretCustody } from ${JSON.stringify(module)};
      const store = new SecretCustody(${JSON.stringify(file)}, ${JSON.stringify(home)},
        { key: () => new Uint8Array(32).fill(7) });
      const session = store.begin({ actor: "ana", tool: "vault", target: "test" });
      const refs = { key: session.capture("MATERIAL_INVENTADO") };
      if (${String(revoked)}) {
        session.replace("signing", refs, 0);
        store.adapter(session, ["signing"]).use(refs, () => new Promise(() => {}));
        session.release("signing", 1);
      }
      process.kill(process.pid, "SIGKILL");`;
    expect(() =>
      execFileSync(process.execPath, ["--input-type=module", "-e", code], { stdio: ["ignore", "pipe", "pipe"] }),
    ).toThrow(expect.objectContaining({ signal: "SIGKILL" }));
    const recovered = new SecretCustody(file, home, { key: () => new Uint8Array(32).fill(7) });
    try {
      expect(recovered.ids()).toEqual([]);
      expect(recovered.facts().filter(fact => fact.kind === "credential-purged")).toHaveLength(1);
      expect(recovered.begin({ actor: "ana", tool: "vault", target: "test" }).current("signing")).toBeUndefined();
    } finally {
      recovered.close();
    }
  });
