// The same derived assertion covers live cases, keyed walks and kept journals, including old incomplete folds.
import type { TSchema } from "@sinclair/typebox";
import type { Program } from "../../tools/tool-contract.ts";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { unpackFixture, packFixture } from "../../../tests/support/snapshot-fixture.ts";
import { serialize } from "node:v8";
import { expect, it, vi } from "vitest";
import { checkReopenedState } from "./reopened-state.ts";
import { SqliteJournal } from "./journal-store.ts";
import * as temporaries from "../../programs/promise-temporaries.ts";
import { staged } from "../../programs/promised-stage.ts";
import { keptChecks } from "../../programs/kept-journals.ts";
import { startHouse } from "../../programs/house-runtime.ts";
import { home, track } from "../../../tests/support/storage-rig.ts";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";

vi.mock("../secrets/secret-vault.ts", async () => {
  const { Redactor } = await import("../secrets/redact.ts");
  return {
    SecretVault: class extends Redactor<Program> {
      constructor(_file: string, schema: TSchema) {
        super(schema, () => {
          throw new Error("This reproduction keeps no secret");
        });
      }
      close() {}
    },
  };
});
const options = {
  ...shopProgram,
  by: "house",
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
};
const time = { now: () => 1_000, wait: () => () => {} };
const corrupt = (file: string, version: boolean) => {
  const db = new DatabaseSync(file);
  try {
    const row = db.prepare("select name, state from snapshots where name like '%:tools:%'").get();
    if (typeof row?.name !== "string" || !(row.state instanceof Uint8Array)) throw new Error("No fixture cache");
    const saved: unknown = unpackFixture(row.state);
    if (typeof saved !== "object" || saved === null || !("seq" in saved)) throw new Error("No fixture sequence");
    db.prepare("update snapshots set state = ? where name = ?").run(
      version ? packFixture({ ...saved, state: "incomplete" }) : serialize({ seq: saved.seq, state: "incomplete" }),
      row.name,
    );
  } finally {
    db.close();
  }
};

it("recovers legacy folds and rejects a plausible current cache that disagrees with the full fold", () => {
  const root = home();
  track(startHouse(root, options, time)).close();
  const file = join(root, "journal.sqlite");
  corrupt(file, false);
  expect(() => checkReopenedState<Shop>(file, options)).not.toThrow();
  corrupt(file, true);
  expect(() => checkReopenedState<Shop>(file, options)).toThrow("Reopened state differs");
});

it("kept checks compare the saved state before discarding it", async () => {
  const root = home();
  track(startHouse(root, options, time)).close();
  corrupt(join(root, "journal.sqlite"), true);
  const checks = keptChecks(shopProgram, shopShown, root).filter(c => c.name.includes("journal.sqlite"));
  expect(checks).toHaveLength(3);
  for (const check of checks.slice(0, 2)) await expect(check.run()).resolves.toBeUndefined();
  await expect(checks[2]?.run()).rejects.toThrow("projectionVersion");
});

it("every staged journey checks its saved state after close", async () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const temporary = vi.spyOn(temporaries, "promiseHome").mockReturnValue(root);
  const close = vi.spyOn(SqliteJournal.prototype, "close").mockImplementation(function (this: SqliteJournal) {
    close.mockRestore();
    this.close();
    corrupt(file, true);
  });
  try {
    await expect(staged(shopProgram, () => Promise.resolve())).rejects.toThrow("Reopened state differs");
  } finally {
    close.mockRestore();
    temporary.mockRestore();
  }
});
