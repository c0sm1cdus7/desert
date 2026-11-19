// Historical core enums survive journal reopening and snapshots while every new emission uses English values.
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { home, open } from "../../tests/support/storage-rig.ts";
import { shop } from "../../tests/support/shop.ts";
import { emptyHouse, houseStep } from "./members.ts";
import { baseProjectionVersion } from "../runtime/projection-version.ts";
import { doorFingerprint, findDoorKey } from "./doors/door-material.ts";
import { evaluatePredicate } from "./rules/rule-predicate.ts";
const definition = {
  id: "historic",
  text: "Frena cuando supera diez",
  action: { tool: "sales", act: "register" },
  condition: { operator: "gt", field: { source: "input", path: "total" }, value: 10 },
  effect: "frena",
};
const facts = [
  ["house-created", {}],
  ["granted", { identity: "ana", tools: ["sales"] }],
  [
    "door-key-issued",
    { id: "historic-key", identity: "ana", door: "agente", fingerprint: doorFingerprint("synthetic-history-key") },
  ],
  [
    "door-invitation-issued",
    { id: "historic-invitation", identity: "ana", door: "agente", fingerprint: "a".repeat(64), expires: 10000 },
  ],
  ["rule-versioned", { definition, version: 1, previous: null }],
  [
    "rule-evaluated",
    { action: { tool: "sales", act: "register" }, results: [{ id: "historic", version: 1, outcome: "frena" }] },
  ],
  ["rule-versioned", { definition: { ...definition, effect: "requiere-supervisor" }, version: 2, previous: 1 }],
  [
    "rule-evaluated",
    {
      action: { tool: "sales", act: "register" },
      results: [{ id: "historic", version: 2, outcome: "requiere-supervisor" }],
    },
  ],
] as const;
it("reads old records into the current domain without modifying their stored bytes, authority or text", () => {
  const file = join(home(), "journal.sqlite");
  open(file).close();
  const db = new DatabaseSync(file);
  try {
    facts.forEach(([kind, data], index) =>
      db
        .prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(index + 1, `historic-${index}`, index, kind, "ana", "[]", JSON.stringify(data), null),
    );
    const original = db.prepare("select * from events order by seq").all();
    const first = open(file);
    const state = first.watch("core-values", emptyHouse, houseStep, baseProjectionVersion);
    first.restore();
    const expected = first.replay(emptyHouse, houseStep);
    expect(state()).toEqual(expected);
    expect(findDoorKey(expected.doors, "synthetic-history-key")).toMatchObject({
      identity: "ana",
      door: "agent",
      revoked: false,
    });
    expect(expected.doors.invitations.get("historic-invitation")?.door).toBe("agent");
    expect(expected.rules.versions.get("historic")?.map(rule => rule.definition.effect)).toEqual([
      "block",
      "require-supervisor",
    ]);
    expect(expected.rules.versions.get("historic")?.[0]?.definition.text).toBe(definition.text);
    expect(expected.rules.active.get("historic")).toBe(2);
    const rule = expected.rules.versions.get("historic")?.[0];
    if (!rule) throw new Error("Missing historical rule");
    expect(
      evaluatePredicate(rule.definition.condition, {
        input: { total: 11 },
        actor: "ana",
        admin: "ana",
        now: 0,
        inJourney: false,
      }),
    ).toBe(true);
    const outcomes = first.replay<string[]>([], (all, event) =>
      event.kind === "rule-evaluated" ? [...all, ...event.data.results.map(result => result.outcome)] : all,
    );
    expect(outcomes).toEqual(["block", "require-supervisor"]);
    first.close();
    const second = open(file);
    const restored = second.watch("core-values", emptyHouse, houseStep, baseProjectionVersion);
    second.restore();
    expect(restored()).toEqual(expected);
    expect(second.replay(emptyHouse, houseStep)).toEqual(expected);
    second.close();
    expect(db.prepare("select * from events order by seq").all()).toEqual(original);
  } finally {
    db.close();
  }
});
it("keeps historical values out of new emissions and leaves program data untouched", () => {
  for (const [kind, data] of facts.slice(2)) {
    const envelope = { layer: "house", kind, by: "ana", cause: [] };
    expect(Value.Check(shop.emission, { ...envelope, data })).toBe(false);
    const current = shop.read({ ...envelope, data, seq: 1, id: "historic", at: 0 });
    expect(Value.Check(shop.emission, { ...envelope, data: current.data })).toBe(true);
  }
  const sale = { ...shop.fact("sale-registered", { sale: "frena", total: 10 }, "ana"), seq: 1, id: "sale", at: 0 };
  expect(shop.read(sale)).toEqual(sale);
});
