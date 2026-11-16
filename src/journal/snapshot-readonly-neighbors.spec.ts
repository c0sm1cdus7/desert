import "../../tests/support/upgrade-vault.ts";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home, open, program, seed, matches } from "../../tests/support/upgrade-support.ts";
import { packFixture, unpackFixture } from "../../tests/support/snapshot-fixture.ts";
import { startState } from "../house/state.ts";
import { effect } from "../house/facts.ts";
import { member } from "../../tests/support/state-mutations.ts";
import type { Shop } from "../../tests/support/shop.ts";
it("even a checksum-valid sequence-zero snapshot is checked before any tail fold", async () => {
  const path = home();
  await seed(path);
  const current = program();
  const db = new DatabaseSync(join(path, "journal.sqlite"));
  try {
    for (const row of db.prepare("select name, state from snapshots").all()) {
      if (typeof row.name !== "string" || !(row.state instanceof Uint8Array)) throw new Error("Missing snapshot");
      const initial = startState<Shop>(current.slices, "shop");
      const state = row.name.includes(":clock:") ? new Map() : structuredClone(initial);
      if (!(state instanceof Map)) Object.assign(state.house, { admin: "beto" });
      const saved = unpackFixture(row.state);
      db.prepare("update snapshots set state = ? where name = ?").run(
        packFixture({ ...saved, seq: 0, state }),
        row.name,
      );
    }
  } finally {
    db.close();
  }
  const house = open(path);
  try {
    expect(house.tools.state().house.admin).toBe("ana");
    expect(house.journal.restoration().warnings.some(w => w.reason.includes("registro"))).toBe(true);
    matches(house, current);
  } finally {
    house.close();
  }
});
for (const damaged of [false, true])
  it(`checks the cached prefix before replaying a tail (${damaged ? "damaged" : "valid"})`, async () => {
    const path = home();
    await seed(path);
    const db = new DatabaseSync(join(path, "journal.sqlite"));
    const rows = db.prepare("select name, state from snapshots").all();
    const writer = open(path);
    writer.bus.emit(effect("scene", { general: "Después de la instantánea" }, "ana"));
    writer.close();
    try {
      for (const row of rows) {
        if (typeof row.name !== "string" || !(row.state instanceof Uint8Array)) throw new Error("Missing snapshot");
        const saved = unpackFixture(row.state);
        if (damaged && row.name.includes(":tools:"))
          Object.assign(member(member(saved, "state"), "house"), { admin: "beto" });
        db.prepare("update snapshots set state = ? where name = ?").run(packFixture(saved), row.name);
      }
    } finally {
      db.close();
    }
    const house = open(path);
    try {
      expect(house.tools.state().house.scenes.get("ana")?.data.general).toBe("Después de la instantánea");
      expect(house.journal.restoration().reused).toBe(!damaged);
      matches(house, program());
    } finally {
      house.close();
    }
  });
