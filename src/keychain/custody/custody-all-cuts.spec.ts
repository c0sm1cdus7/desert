import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { processKeys } from "../../../tests/support/custody-provider.ts";
import { containing } from "../../../tests/support/custody-files.ts";
import { SecretCustody } from "./secret-custody.ts";
const script = fileURLToPath(new URL("../../../tests/support/custody-all-cuts.ts", import.meta.url));
function legacy() {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file);
  db.exec("pragma journal_mode=WAL; create table secrets(id text primary key, value text)");
  db.prepare("insert into secrets values (?,?)").run("secret:00000000-0000-0000-0000-000000000001", "SYNTHETIC_LEGACY");
  db.close();
  return rig;
}
it("p6: SIGKILL before and after every disk and provider write, without losing bindings", async () => {
  const dry = legacy(),
    output = join(dry.home, "calls.json");
  const child = spawnSync(process.execPath, [script, dry.file, dry.home, "0", "none", output], { encoding: "utf8" });
  expect(child.status, child.stderr).toBe(0);
  const calls: unknown = JSON.parse(readFileSync(output, "utf8"));
  if (!Array.isArray(calls)) throw new Error("fixture");
  expect(calls).toContain("anchor");
  expect(calls).toContain("forget");
  expect(calls).toContain("compact");
  const points = calls.flatMap((_, index) => ["before", "after"].map(phase => ({ n: index + 1, phase })));
  for (const { n, phase } of points) {
    const rig = legacy(),
      label = `${n}/${String(calls[n - 1])}/${phase}`;
    const killed = spawnSync(process.execPath, [script, rig.file, rig.home, String(n), phase], { encoding: "utf8" });
    expect(killed.signal, `${label}: ${killed.stderr}`).toBe("SIGKILL");
    if (calls.slice(0, phase === "after" ? n : n - 1).includes("retire"))
      expect(containing(rig.home, "SYNTHETIC_LEGACY"), label).toEqual([]);
    const recovered = new SecretCustody(rig.file, rig.home, processKeys(rig.home));
    try {
      const session = recovered.begin(custodyScope),
        current = session.current("signing");
      if (current)
        await expect(
          recovered.adapter(session, ["signing"]).use(current.refs, () => true),
          label,
        ).resolves.toBe(true);
      expect(containing(rig.home, "SYNTHETIC_LEGACY"), label).toEqual([]);
      for (const marker of ["FIRST_SYNTHETIC", "SECOND_SYNTHETIC", "PROVISIONAL_SYNTHETIC"])
        expect(containing(rig.home, marker), label).toEqual([]);
      session.replace("after-cut", { key: session.capture(Buffer.from("CONTINUES")) }, 0);
    } finally {
      recovered.close();
    }
  }
}, 30000);
