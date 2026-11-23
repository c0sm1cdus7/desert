import type { Tool } from "../../surface/contract/shown-tool.ts";
import { migratedJournal } from "../../../tests/support/migrated-journal.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { SqliteJournal } from "../../storage/journal-store.ts";
import { MemoryHouseKeys } from "../../keychain/custody/house-keys.ts";
import { startHouse, localPorts, type RunningHouse } from "../../runtime/house-runtime.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { effect } from "../../house/facts.ts";
import { identityNameTexts } from "../../texts/tools.texts.ts";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";
function rejectLegacy(house: RunningHouse<Shop>, core: Tool | undefined): void {
  for (const [act, target] of [
    ["hand", "identities/Ana vieja"],
    ["readmit", "identities/Bad"],
  ]) {
    if (!act || !target) throw new Error("missing test action");
    house.tools.act({ act: "attend", input: { target } }, 0, "ana");
    const result = house.tools.act({ act, target, input: {} }, house.tools.state().through, "ana");
    expect(result).toMatchObject({ status: "rejected", reason: identityNameTexts.rule });
    expect(core?.actsOn?.[act]?.off?.(target)).toBe(identityNameTexts.rule);
  }
}
it("reads historical invalid identifiers and refuses new handovers or readmission to them", () => {
  const home = mkdtempSync(join(tmpdir(), "identities-legacy-"));
  try {
    const old = new SqliteJournal(join(home, "journal.sqlite"), shopProgram.words);
    old.append(effect("house-created", {}, "ana"), 0);
    old.append(effect("granted", { identity: "Ana vieja", tools: ["sales"] }, "ana"), 1);
    old.append(effect("granted", { identity: "Bad", tools: [] }, "ana"), 2);
    old.append(effect("removed", { identity: "Bad" }, "ana"), 3);
    old.close();
    migratedJournal(home);
    for (let reopened = 0; reopened < 2; reopened++) {
      const house = startHouse(home, {
        ...shopProgram,
        identities: true,
        by: "house",
        creation: { admin: "ana", language: "es", assignments: [] },
        secretKeys: new MemoryHouseKeys(),
      });
      try {
        const core = houseTools(localPorts(house, "ana", { recentLines: 20 }), shopShown).find(
          tool => tool.id === "identities",
        );
        expect(
          core
            ?.view()
            .filter(stack => stack.title === "Identidades")
            .flatMap(stack => stack.rows)
            .map(row => row.title),
        ).toEqual(["ana", "Ana vieja", "Bad"]);
        expect(
          core
            ?.view("identities/Ana vieja")
            .flatMap(stack => stack.rows)
            .some(row => row.detail === "sales · Algunas acciones"),
        ).toBe(true);
        expect(core?.view("identities/Ana vieja#kit:sales").flatMap(stack => stack.rows)).toContainEqual(
          expect.objectContaining({ title: "sales", detail: "Todo, también lo nuevo" }),
        );
        expect(
          core
            ?.view()
            .find(stack => stack.title === "Mentes")
            ?.rows.map(row => row.title),
        ).toEqual(["mente de sales", "mente de payments"]);
        rejectLegacy(house, core);
        expect(house.tools.state().house.admin).toBe("ana");
        expect(house.tools.state().house.removed.has("Bad")).toBe(true);
      } finally {
        house.close();
      }
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
it("rejects a reserved initial grant before creating any part of the house", () => {
  const home = mkdtempSync(join(tmpdir(), "identities-initial-"));
  try {
    expect(() =>
      startHouse(home, {
        ...shopProgram,
        identities: true,
        by: "house",
        creation: {
          admin: "ana",
          language: "es",
          assignments: [{ identity: "beto", tools: ["identities"], language: "es" }],
        },
        secretKeys: new MemoryHouseKeys(),
      }),
    ).toThrow("Identidades");
    const journal = new SqliteJournal(join(home, "journal.sqlite"), shopProgram.words);
    try {
      expect(journal.replay(0, count => count + 1)).toBe(0);
    } finally {
      journal.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
