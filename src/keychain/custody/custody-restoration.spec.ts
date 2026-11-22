import { expect, it } from "vitest";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { custodyHead, custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { SecretCustody } from "./secret-custody.ts";
for (const operation of ["rotate", "release", "legacy", "copy"])
  it(`accepts a backup from before ${operation}, names what is unusable and keeps the other binding`, async () => {
    const rig = custodyRig();
    let store = rig.open();
    let session = store.begin(custodyScope);
    const old = operation === "legacy" ? store.keep(Buffer.from("previous")) : session.capture(Buffer.from("previous"));
    if (operation !== "legacy") session.replace("signing", { key: old }, 0);
    const stable = session.capture(Buffer.from("current"));
    session.replace("ticket", { key: stable }, 0);
    const head = custodyHead(store.facts());
    store.close();
    const backup = join(rig.home, "backup.sqlite");
    copyFileSync(rig.file, backup);
    store = operation === "copy" ? new SecretCustody(backup, rig.home, rig.keys) : rig.open();
    session = store.begin(custodyScope);
    if (operation === "legacy") store.discardLegacy(old);
    else if (operation === "release") session.release("signing", 1);
    else session.replace("signing", { key: session.capture(Buffer.from("new")) }, 1);
    store.close();
    if (operation !== "copy") copyFileSync(backup, rig.file);
    expect(() => rig.open()).toThrow("E-CUSTODY-ROLLBACK");
    SecretCustody.acceptRestoredCopy(rig.file, rig.home, rig.keys, head);
    store = rig.open();
    session = store.begin(custodyScope);
    expect(session.current("signing")).toBeUndefined();
    if (operation !== "legacy") {
      expect(store.facts()).toContainEqual(
        expect.objectContaining({ kind: "credential-unusable", slot: "signing", refs: { key: old } }),
      );
      expect(session.revision("signing")).toBe(2);
    }
    expect(store.facts()).toContainEqual(
      expect.objectContaining({ kind: "credential-purged", refs: { material: old } }),
    );
    expect(store.ids()).not.toContain(old);
    await expect(store.adapter(session, ["ticket"]).use({ key: stable }, bytes => bytes.key?.length)).resolves.toBe(7);
  });
