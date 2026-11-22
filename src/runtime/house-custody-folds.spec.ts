// Fourth review: maintenance keeps the folds, just as opening does.
// Invented data; in-memory keyring.
import { expect, it, vi } from "vitest";
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported } from "../../tests/support/declared-adapters.ts";
import { toolAct } from "../tools/act-definition.ts";
import { CustodyDatabase } from "../keychain/custody/custody-database.ts";
import { startHouse } from "./house-runtime.ts";
import { SecretCustody } from "../keychain/custody/secret-custody.ts";
import * as runtime from "./house-runtime.ts";
const empty = Type.Object({});
const acts: import("../tools/tool-contract.ts").Tool<import("../../tests/support/shop.ts").Shop>["acts"] = {
  rotate: toolAct(empty, async (_, ctx) => ({
    status: "accepted",
    effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
  })),
  release: toolAct(empty, (_, ctx) => ({
    status: "accepted",
    effects: [ctx.credentials.release("signing", ctx.credentials.revision("signing"))],
  })),
};
const snapshots = (path: string) => {
  const db = new DatabaseSync(join(path, "journal.sqlite"), { readOnly: true });
  try {
    return db.prepare("select name, state from snapshots order by name").all();
  } finally {
    db.close();
  }
};
it("N1-a: accepting a restore through maintenance keeps the stored folds", async () => {
  const warnings: string[] = [];
  const listen = (w: Error) => warnings.push(w.message);
  process.on("warning", listen);
  const rig = adapterHouse(acts);
  const backup = `${rig.path}-backup`;
  try {
    expect((await rig.act("rotate")).status).toBe("accepted");
    rig.close();
    startHouse(rig.path, { ...rig.options, by: "beto" }).close();
    cpSync(rig.path, backup, { recursive: true });
    rig.restart();
    expect((await rig.act("rotate")).status).toBe("accepted");
    rig.close();
    rmSync(rig.path, { recursive: true });
    cpSync(backup, rig.path, { recursive: true });
    const before = snapshots(rig.path);
    const review = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "review" });
    runtime.maintainHouseCustody(rig.path, rig.options, { operation: "accept", head: review.head });
    const after = snapshots(rig.path);
    rig.restart();
    const restoration = rig.journal().restoration();
    await new Promise(r => setTimeout(r, 10));
    expect(before.length).toBeGreaterThan(0);
    expect(after).toEqual(before);
    expect(restoration.reused).toBe(true);
    expect(warnings).toEqual([]);
  } finally {
    process.off("warning", listen);
    rmSync(backup, { recursive: true, force: true });
  }
});
it("N1-b: retrying a pending deletion through maintenance keeps the stored folds", async () => {
  const warnings: string[] = [];
  const listen = (w: Error) => warnings.push(w.message);
  process.on("warning", listen);
  const rig = adapterHouse(acts);
  try {
    rig.close();
    startHouse(rig.path, { ...rig.options, by: "beto" }).close();
    rig.restart();
    await rig.act("rotate");
    const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
      throw new Error("disk");
    });
    expect(await rig.act("release")).toMatchObject({ status: "accepted", cleanupPending: true });
    rig.close();
    fail.mockRestore();
    const before = snapshots(rig.path);
    const retried = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "retry" });
    const after = snapshots(rig.path);
    rig.restart();
    const restoration = rig.journal().restoration();
    await new Promise(r => setTimeout(r, 10));
    expect(retried.cleanupPending).toBe(false);
    expect(after).toEqual(before);
    expect(restoration.reused).toBe(true);
    expect(warnings).toEqual([]);
  } finally {
    process.off("warning", listen);
  }
});

for (const operation of ["adopt", "discard"] as const)
  it(`B1: ${operation} keeps both identities' folds and folds the tail on opening`, () => {
    const rig = adapterHouse(acts);
    rig.close();
    startHouse(rig.path, { ...rig.options, by: "beto" }).close();
    const custody = new SecretCustody(join(rig.path, "fixture.sqlite"), rig.path, rig.options.secretKeys);
    const ref = custody.keep(Buffer.from("legado sintético"));
    custody.close();
    const before = snapshots(rig.path);
    expect(before).toHaveLength(4);
    const warn = vi.spyOn(process, "emitWarning");
    try {
      const request =
        operation === "adopt"
          ? {
              operation,
              scope: { actor: "ana", tool: "vault", target: "vault" },
              slot: "signing",
              refs: { key: ref },
              expected: 0,
            }
          : { operation, ref };
      runtime.maintainHouseCustody(rig.path, rig.options, request);
      expect(snapshots(rig.path)).toEqual(before);
      rig.restart();
      expect(rig.journal().restoration().reused).toBe(true);
      expect(JSON.stringify(rig.facts())).toContain(operation === "adopt" ? "credential-bound" : "credential-purged");
      rig.close();
      const other = startHouse(rig.path, { ...rig.options, by: "beto" });
      expect(other.journal.restoration().reused).toBe(true);
      other.close();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
