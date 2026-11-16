import { expect, expectTypeOf, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteJournal } from "../storage/journal-store.ts";
import { emptyHouse, houseStep, identityView } from "./members.ts";
import { effect, type HouseEmission, type HouseKind } from "./facts.ts";
import { shop, shopSlices, type Shop, type ShopFact } from "../../tests/support/shop.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { startState, toolsStep } from "./state.ts";
import type { ActResult } from "../tools/tool-contract.ts";

it("reads old channel and recipient facts, then folds the channel as no-op", () => {
  const channel = shop.read({
    layer: "house",
    kind: "channel-created",
    data: { channel: "communicator/old", members: ["ana", "beto"] },
    by: "ana",
    cause: [],
    id: "old-channel",
    at: 1,
    seq: 1,
  });
  const entry = shop.read({
    layer: "house",
    kind: "tool-entry",
    data: { tool: "sales", target: "sales/s1", author: "ana", text: "Viejo", recipient: "beto" },
    by: "ana",
    cause: [],
    id: "old-entry",
    at: 2,
    seq: 2,
  });
  const done = shop.read({
    layer: "house",
    kind: "act-done",
    data: { object: "sales/s1", act: "register", text: "Viejo", recipient: "beto" },
    by: "ana",
    cause: [],
    id: "old-done",
    at: 3,
    seq: 3,
  });
  expect(channel.kind).toBe("channel-created");
  expect(entry.data).toMatchObject({ recipient: "beto" });
  expect(done.data).toMatchObject({ recipient: "beto" });
  expect(
    Value.Check(shop.emission, {
      layer: "house",
      kind: "channel-created",
      data: { channel: "communicator/new", members: ["ana", "beto"] },
      by: "ana",
      cause: [],
    }),
  ).toBe(false);
  expect(
    Value.Check(shop.emission, {
      layer: "house",
      kind: "tool-entry",
      data: { tool: "sales", target: "sales/s1", author: "ana", text: "Nuevo", recipient: "beto" },
      by: "ana",
      cause: [],
    }),
  ).toBe(false);
  const folded = houseStep(emptyHouse, channel);
  expect(folded).toEqual(emptyHouse);
});

it("shows every house entry in each identity view, including one with an old recipient", () => {
  const rig = shopRig({ grants: { ana: ["sales"], beto: [], carla: [] } });
  try {
    const old = structuredClone(
      shop.read({
        layer: "house",
        kind: "tool-entry",
        data: { tool: "sales", target: "sales/s1", author: "ana", text: "Viejo", recipient: "beto" },
        by: "ana",
        cause: [],
        id: "old-entry",
        at: 2,
        seq: 2,
      }),
    );
    if (old.kind !== "tool-entry") throw new Error("el registro viejo no leyó una entrada");
    const state = { ...rig.state(), entries: [old] };
    expect(["ana", "beto", "carla"].map(by => identityView(state, by).entries)).toEqual([[old], [old], [old]]);
  } finally {
    rig.close();
  }
});

it("does not keep legacy channels in newly folded house state", () => {
  const state = houseStep(emptyHouse, { ...effect("house-created", {}, "ana"), id: "1", seq: 1, at: 0 });
  expect("channels" in state).toBe(false);
});

it("opens a saved journal with channel and recipient facts and reads its entry in every identity view", () => {
  const directory = mkdtempSync(join(tmpdir(), "casa-kit-legacy-"));
  const file = join(directory, "journal.sqlite");
  const raw = new DatabaseSync(file);
  raw.exec(`
    create table events (
      seq integer primary key, id text not null unique, at integer not null,
      kind text not null, by text not null, cause text not null, data text not null, process text
    );
  `);
  const insert = raw.prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, null)");
  const saved = [
    [1, "1", 1, "house-created", "ana", [], {}],
    [2, "2", 2, "granted", "ana", [], { identity: "beto", tools: ["sales"] }],
    [3, "3", 3, "channel-created", "ana", [], { channel: "communicator/old", members: ["ana", "beto"] }],
    [
      4,
      "4",
      4,
      "tool-entry",
      "ana",
      [],
      { tool: "sales", target: "sales/s1", author: "ana", text: "Viejo", recipient: "beto" },
    ],
    [5, "5", 5, "act-done", "ana", [], { object: "sales/s1", act: "register", text: "Viejo", recipient: "beto" }],
  ] as const;
  for (const [seq, id, at, kind, by, cause, data] of saved)
    insert.run(seq, id, at, kind, by, JSON.stringify(cause), JSON.stringify(data));
  raw.close();
  const journal = new SqliteJournal<ShopFact>(file, shop);
  try {
    const state = journal.watch("tools", startState<Shop>(shopSlices, "ana"), (before, event) =>
      toolsStep<Shop>(before, event, shopSlices),
    );
    journal.restore();
    expect(state().house.admin).toBe("ana");
    expect("channels" in state().house).toBe(false);
    expect(["ana", "beto"].map(by => identityView(state(), by).entries.map(entry => entry.data.text))).toEqual([
      ["Viejo"],
      ["Viejo"],
    ]);
  } finally {
    journal.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

it("keeps legacy names and destinations out of the current writing types", () => {
  expectTypeOf<Extract<HouseKind, "channel-created">>().toEqualTypeOf<never>();
  expectTypeOf<Extract<HouseEmission, { kind: "tool-entry" }>["data"]>().not.toHaveProperty("recipient");
  expectTypeOf<Extract<HouseEmission, { kind: "act-done" }>["data"]>().not.toHaveProperty("recipient");
  expectTypeOf<Extract<ActResult<Shop>, { status: "accepted" }>>().not.toHaveProperty("recipient");
});
