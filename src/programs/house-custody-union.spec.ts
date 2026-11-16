import { expect, it, vi } from "vitest";
import { copyFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported } from "../../tests/support/declared-adapters.ts";
import { startHouse } from "./house-runtime.ts";
import type { ToolStartup } from "../tools/startup-contract.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { Type } from "@sinclair/typebox";
import { toolAct } from "../tools/act-definition.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { effect } from "../journal/events.ts";
import { SecretCustody } from "../adapters/secrets/custody/secret-custody.ts";
import { CustodyDatabase } from "../adapters/secrets/custody/custody-database.ts";
function snapshots(file: string) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db
      .prepare("select name from snapshots order by name")
      .all()
      .map(row => row.name);
  } finally {
    db.close();
  }
}
it("H2: limpiar material huérfano conserva los plegados de dos identidades y no inventa avisos", async () => {
  let startup: ToolStartup<Shop> | undefined;
  const rig = adapterHouse(
    {},
    {
      start: ports => {
        startup = ports;
        return () => {};
      },
    },
  );
  rig.close();
  const other = startHouse(rig.path, { ...rig.options, by: "beto" });
  other.close();
  rig.restart();
  if (!startup) throw new Error("fixture");
  await imported(startup);
  // Simulate the stop after capture, before the startup lease can clean its unbound material.
  const finish = vi.spyOn(SecretCustody.prototype, "finish").mockImplementation(() => {});
  try {
    rig.close();
  } finally {
    finish.mockRestore();
  }
  const file = join(rig.path, "journal.sqlite"),
    before = snapshots(file);
  expect(before).toHaveLength(4);
  const reopened = startHouse(rig.path, rig.options);
  try {
    expect(reopened.journal.restoration()).toEqual({ reused: true, warnings: [] });
    expect(reopened.storageNotices()).toEqual([]);
    expect(snapshots(file)).toEqual(before);
    expect(JSON.stringify(reopened.journal.replay<unknown[]>([], (all, e) => [...all, e]))).toContain(
      "credential-purged",
    );
  } finally {
    reopened.close();
  }
  const again = startHouse(rig.path, { ...rig.options, by: "beto" });
  try {
    expect(again.journal.restoration()).toEqual({ reused: true, warnings: [] });
  } finally {
    again.close();
  }
});
for (const mode of ["removed", "replaced"])
  it(`H5: el escritor ${mode} no retiene material antes de rechazar el hecho`, () => {
    const rig = adapterHouse({
      set: toolAct(Type.Object({ value: Type.String({ secret: true }) }), () => ({ status: "accepted" })),
    });
    const sidecar = join(rig.path, "journal.sqlite.writer.sqlite");
    if (mode === "removed") rmSync(sidecar);
    else {
      copyFileSync(sidecar, `${sidecar}.replacement`);
      renameSync(`${sidecar}.replacement`, sidecar);
    }
    const next = new SqliteJournal(join(rig.path, "journal.sqlite"), rig.options.words);
    const keep = vi.spyOn(SecretCustody.prototype, "keep");
    const intent = vi.spyOn(CustodyDatabase.prototype, "intent");
    const keys = vi.spyOn(rig.options.secretKeys, "key");
    try {
      // A direct secret-bearing act event reaches the same kept boundary as an action ingress.
      const event = effect("act", { object: "vault", option: "set", input: { value: "inventado" } }, "ana");
      expect(() => rig.bus().emit(event)).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
      expect(keep.mock.calls.length).toBe(0);
      expect(intent.mock.calls.length).toBe(0);
      expect(keys.mock.calls.length).toBe(0);
    } finally {
      keep.mockRestore();
      intent.mockRestore();
      keys.mockRestore();
      expect(() => rig.close()).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
      next.close();
    }
  });

it("H5: un adaptador de arranque tampoco captura después de perder el escritor", async () => {
  let startup: ToolStartup<Shop> | undefined;
  const rig = adapterHouse(
    {},
    {
      start: ports => {
        startup = ports;
        return () => {};
      },
    },
  );
  if (!startup) throw new Error("fixture");
  rmSync(join(rig.path, "journal.sqlite.writer.sqlite"));
  const intent = vi.spyOn(CustodyDatabase.prototype, "intent");
  const keys = vi.spyOn(rig.options.secretKeys, "key");
  try {
    await expect(imported(startup)).rejects.toBeDefined();
    expect(intent.mock.calls.length).toBe(0);
    expect(keys.mock.calls.length).toBe(0);
  } finally {
    intent.mockRestore();
    keys.mockRestore();
    expect(() => rig.close()).toThrow();
  }
});

it("el control del registro propio conserva su receptor y rechaza antes de crear material", () => {
  const rig = adapterHouse({});
  let owned = true;
  const ledger = {
    facts: () => [],
    append: () => {},
    check() {
      expect(this).toBe(ledger);
      if (!owned) throw new Error("escritor perdido");
    },
  };
  const custody = new SecretCustody(join(rig.path, "independent.sqlite"), rig.path, rig.options.secretKeys, ledger);
  const intent = vi.spyOn(CustodyDatabase.prototype, "intent");
  const keys = vi.spyOn(rig.options.secretKeys, "key");
  try {
    owned = false;
    const buffer = Buffer.from("inventado");
    expect(() => custody.keep(buffer)).toThrow("escritor perdido");
    expect(buffer.every(byte => byte === 0)).toBe(true);
    expect(intent.mock.calls.length).toBe(0);
    expect(keys.mock.calls.length).toBe(0);
  } finally {
    intent.mockRestore();
    keys.mockRestore();
    custody.close();
  }
});
