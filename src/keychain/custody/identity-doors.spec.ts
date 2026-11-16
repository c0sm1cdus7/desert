import "../../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { SqliteJournal } from "../../storage/journal-store.ts";
import { effect } from "../../house/facts.ts";
import { startHouse } from "../../runtime/house-runtime.ts";
import { shop, shopRegistry, shopSlices, type Shop } from "../../../tests/support/shop.ts";
import { MemoryHouseKeys } from "./house-keys.ts";

const cases: [string, boolean][] = [
  ["a", true],
  ["a".repeat(64), true],
  ["a".repeat(65), false],
  ["a.", true],
  ["a-", true],
  ["mind", true],
  ["me", true],
  ["shop", false],
  ["", false],
  ["1a", false],
  ["a:b", false],
  ...[
    "Mind:casa",
    "MIND:casa",
    "mind :casa",
    "mind：casa",
    "mіnd:casa",
    "mind:",
    "Kenon",
    "KENON",
    "kenon​",
    "kenon͏",
    "ken­on",
    "kеnon",
    "kénon",
    "ana beto",
    "ana  beto",
    "ana beto",
    "ana　",
    "　ana",
    "ana beto",
    "ana\u0085",
    "🦫",
    "👩‍💻",
    "🇦🇷",
    "ána",
    "ána",
    "secret:x",
    "attention:x",
    "communicator/house",
    "a".repeat(161),
    "a".repeat(100000),
    "́",
    "ㅤ",
    "⠀",
    "ᅟ",
    "ana",
    "ana‮otse",
    " ana",
    "ana ",
    "ana\n",
    "a\u0001na",
  ].map((value): [string, boolean] => [value, false]),
];
const options = {
  by: "shop",
  projectionVersion: "shop/1",
  creation: { admin: "ana", assignments: [] },
  words: shop,
  registry: shopRegistry,
  slices: shopSlices,
  secretKeys: new MemoryHouseKeys(),
};
const facts = (house: ReturnType<typeof startHouse<Shop>>) => house.journal.replay(0, count => count + 1);

function checkDoor(action: () => unknown, valid: boolean, count: () => number) {
  const before = count();
  if (valid) expect(action).not.toThrow();
  else {
    expect(action).toThrow(/letra.*64/);
    expect(count()).toBe(before);
  }
}

it.each(cases)("validates each door for case %#", (identity, valid) => {
  const path = mkdtempSync(join(tmpdir(), "identity-doors-"));
  try {
    if (!valid && identity) {
      const old = new SqliteJournal(join(path, "journal.sqlite"), shop);
      old.append(effect("house-created", {}, "ana"), 0);
      old.append(effect("granted", { identity, tools: ["sales"] }, "ana"), 1);
      old.append(effect("removed", { identity }, "ana"), 2);
      old.close();
    }
    const house = startHouse(path, options);
    try {
      const grant = () => house.bus.emit(effect("granted", { identity, tools: [] }, "ana"));
      const hand = () => house.bus.emit(effect("handed", { to: identity }, "ana"));
      const readmit = () => house.bus.emit(effect("granted", { identity, tools: [] }, "ana"));
      for (const action of [
        grant,
        () => house.bus.emit(effect("house-created", {}, identity)),
        () => {
          if (valid) house.bus.emit(effect("removed", { identity }, "ana"));
          return readmit();
        },
        hand,
      ]) {
        checkDoor(action, valid, () => facts(house));
      }
    } finally {
      house.close();
    }
    const other = mkdtempSync(join(tmpdir(), "identity-creation-"));
    try {
      const create = () => startHouse(other, { ...options, creation: { admin: identity, assignments: [] } });
      if (valid) create().close();
      else expect(create).toThrow(/letra.*64/);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});

it("folds historical invalid identities unchanged across reopening", () => {
  const path = mkdtempSync(join(tmpdir(), "identity-old-"));
  try {
    const old = new SqliteJournal(join(path, "journal.sqlite"), shop);
    old.append(effect("house-created", {}, "ana"), 0);
    old.append(effect("granted", { identity: "Ana​", tools: ["sales"] }, "ana"), 1);
    old.append(effect("granted", { identity: "Mala", tools: ["sales"] }, "ana"), 2);
    old.append(effect("removed", { identity: "Mala" }, "ana"), 3);
    old.append(effect("handed", { to: "Ana​" }, "ana"), 4);
    old.close();
    const reopened = startHouse(path, options);
    try {
      expect(reopened.tools.state().house.admin).toBe("Ana​");
      expect(reopened.tools.state().house.removed.has("Mala")).toBe(true);
      expect(() => reopened.bus.emit(effect("granted", { identity: "Mala", tools: [] }, "Ana​"))).toThrow(/letra.*64/);
      expect(reopened.tools.state().house.grants.get("Ana​")).toEqual(["sales"]);
      expect(() => reopened.bus.emit(effect("handed", { to: "Ana​" }, "Ana​"))).toThrow(/letra.*64/);
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});

it("bounds visible display names before writing and validates all initial assignments before creation", () => {
  const path = mkdtempSync(join(tmpdir(), "identity-display-"));
  try {
    expect(() =>
      startHouse(path, { ...options, creation: { admin: "ana", assignments: [{ identity: "Mala", tools: [] }] } }),
    ).toThrow(/letra.*64/);
    const journal = new SqliteJournal(join(path, "journal.sqlite"), shop);
    expect(journal.replay(0, n => n + 1)).toBe(0);
    journal.close();
    const house = startHouse(path, { ...options, creation: { admin: "carla", assignments: [] } });
    try {
      expect(house.tools.state().house.admin).toBe("carla");
      expect(house.journal.replay(0, (n, e) => n + (e.kind === "house-created" ? 1 : 0))).toBe(1);
      for (const name of [" ", "\u200b", "a".repeat(161)]) {
        const before = facts(house);
        expect(() => house.bus.emit(effect("named", { identity: "ana", name }, "ana"))).toThrow();
        expect(facts(house)).toBe(before);
      }
      house.bus.emit(effect("named", { identity: "ana", name: "a".repeat(160) }, "ana"));
    } finally {
      house.close();
    }
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});

it("rejects an invalid identity through the running journal before writing", () => {
  const path = mkdtempSync(join(tmpdir(), "identity-journal-"));
  try {
    const house = startHouse(path, options);
    try {
      const before = facts(house);
      expect(() => house.journal.append(effect("granted", { identity: "Mala", tools: [] }, "ana"), 1)).toThrow(
        /letra.*64/,
      );
      expect(facts(house)).toBe(before);
    } finally {
      house.close();
    }
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});
