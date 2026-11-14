import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { processKeys } from "../../../tests/support/custody-provider.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
const script = fileURLToPath(new URL("../../../tests/support/custody-heap.ts", import.meta.url));
it("p3: un proceso nuevo abre tres secretos, usa uno y su snapshot no contiene ninguno como texto", () => {
  const rig = custodyRig(),
    store = new SecretCustody(rig.file, rig.home, processKeys(rig.home));
  const markers = Array.from({ length: 3 }, () => randomBytes(48).toString("hex"));
  for (const [n, marker] of markers.entries()) {
    const session = store.begin({ ...custodyScope, tool: n === 0 ? "vault" : `other-${n}` });
    session.replace("signing", { key: session.capture(Buffer.from(marker)) }, 0);
  }
  store.close();
  const child = spawnSync(process.execPath, [script, rig.file, rig.home], { encoding: "utf8", timeout: 15000 });
  expect(child.status, child.stderr).toBe(0);
  const heap = readFileSync(join(rig.home, "synthetic.heapsnapshot"));
  for (const marker of markers) expect(heap.includes(Buffer.from(marker))).toBe(false);
});
it("p7: un segundo proceso no abre durante el uso de otro", async () => {
  const rig = custodyRig(),
    store = new SecretCustody(rig.file, rig.home, processKeys(rig.home));
  try {
    const session = store.begin(custodyScope),
      refs = { key: session.capture(Buffer.from("inventado")) };
    await store.adapter(session, []).use(refs, () => {
      const child = spawnSync(process.execPath, [script, rig.file, rig.home, "probe"], {
        encoding: "utf8",
        timeout: 5000,
      });
      expect(child.status).not.toBe(0);
      expect(child.stderr).toContain("E-CUSTODY-LOCKED");
    });
  } finally {
    store.close();
  }
});
