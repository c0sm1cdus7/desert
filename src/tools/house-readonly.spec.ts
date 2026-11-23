import { member, mutate } from "../../tests/support/state-mutations.ts";
import "../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { zeroSlices } from "../../tests/support/zero-mind.ts";
import { startState, toolsStep } from "../house/state.ts";
import { home, open, program, seed, matches } from "../../tests/support/upgrade-support.ts";
import { packFixture, unpackFixture } from "../../tests/support/snapshot-fixture.ts";
import type { Shop } from "../../tests/support/shop.ts";
it("N1real: startup cannot grant itself authority, including across close and reopen", async () => {
  const rig = zeroHouse();
  const state = rig.mind.startup().state();
  expect(() => mutate(state.house.kits, "set", "mind:desk", new Map([["desk", null]]))).toThrow(TypeError);
  expect(() => Object.assign(state.house, { admin: "beto" })).toThrow(TypeError);
  rig.restart();
  expect(await rig.mind.act()).toMatchObject({ status: "rejected" });
  expect(rig.house().tools.state()).toEqual(
    rig
      .house()
      .journal.replay(startState<Shop>(zeroSlices, "shop"), (state, event) =>
        toolsStep<Shop>(state, event, zeroSlices),
      ),
  );
  expect(rig.facts().filter(e => e.kind === "kit-set" || e.kind === "mind-noted")).toEqual([]);
});
for (const part of ["admin", "kits", "grants", "wakeOwners", "tools", "clock"])
  it(`discards a valid old snapshot with forged ${part} before startup`, async () => {
    const path = home();
    await seed(path);
    const db = new DatabaseSync(join(path, "journal.sqlite"));
    try {
      const row = db
        .prepare("select name, state from snapshots where name like ?")
        .get(`%:${part === "clock" ? "clock" : "tools"}:%`);
      if (!row || typeof row.name !== "string" || !(row.state instanceof Uint8Array))
        throw new Error("Missing snapshot");
      const saved = unpackFixture(row.state);
      const state = member(saved, "state");
      const house = part === "clock" ? {} : member(state, "house");
      if (part === "admin") Object.assign(house, { admin: "beto" });
      if (part === "kits") mutate(member(house, "kits"), "set", "mind:desk", new Map([["desk", null]]));
      if (part === "grants") mutate(member(house, "grants"), "set", "eve", ["sales"]);
      if (part === "wakeOwners") mutate(member(state, "wakeOwners"), "set", "other:x", "mind:desk");
      if (part === "tools") Object.assign(member(member(state, "tools"), "payments"), { received: 999 });
      if (part === "clock") mutate(state, "set", "fake", { at: 999, cause: "missing" });
      db.prepare("update snapshots set state = ? where name = ?").run(packFixture(saved), row.name);
    } finally {
      db.close();
    }
    let starts = 0;
    const current = program();
    const registry = current.registry.map(tool => ({
      ...tool,
      start: (ports: Parameters<NonNullable<typeof tool.start>>[0]) => {
        expect(ports.state().house.admin).toBe("ana");
        expect(ports.state().house.grants.has("eve")).toBe(false);
        starts++;
        return () => {};
      },
    }));
    const house = open(path, { ...current, registry });
    try {
      matches(house, current);
      expect(starts).toBeGreaterThan(0);
      expect(house.journal.restoration().reused).toBe(false);
      expect(house.journal.restoration().warnings.some(w => w.reason.includes("record"))).toBe(true);
    } finally {
      house.close();
    }
    const again = open(path);
    try {
      matches(again, current);
      expect(again.journal.restoration().warnings).toEqual([]);
    } finally {
      again.close();
    }
  });
