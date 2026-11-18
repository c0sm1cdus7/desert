import { copyFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { home, open } from "../../tests/support/storage-rig.ts";
import { shop } from "../../tests/support/shop.ts";
import { emptyHouse, houseStep } from "./members.ts";
import { allowedAct, effectiveKit } from "./kit.ts";
import { effect } from "./facts.ts";
import { selectionKit } from "./kit-selection.ts";
import { checkKitMigration, migrateKit } from "./kit-migration.ts";
const kit = selectionKit([{ kind: "tool", program: "sales", tool: "sales" }]);
it.each(["0ec3f7b", "19a0b47"])("keeps legacy %s intact through snapshot restore and full replay", revision => {
  const source = new URL(`../../tests/fixtures/legacy-${revision}.sqlite`, import.meta.url);
  const original = readFileSync(source);
  const file = join(home(), "journal.sqlite");
  copyFileSync(source, file);
  const first = open(file);
  const state = first.watch("kit-history", emptyHouse, houseStep, "kit-v2");
  first.restore();
  const expected = first.replay(emptyHouse, houseStep);
  expect(state()).toEqual(expected);
  const facts = first.replay<unknown[]>([], (all, event) => [...all, event]);
  first.close();
  const second = open(file);
  const restored = second.watch("kit-history", emptyHouse, houseStep, "kit-v2");
  second.restore();
  expect(restored()).toEqual(expected);
  expect(second.replay<unknown[]>([], (all, event) => [...all, event])).toEqual(facts);
  expect(readFileSync(source)).toEqual(original);
});
it("replays a mixed synthetic journal, revocation, readmission, delegation and closed journey", () => {
  const events = [
    effect("house-created", {}, "ana"),
    effect("granted", { identity: "beto", tools: ["sales", "payments"] }, "ana"),
    effect("kit-set", { holder: "beto", tool: "sales", acts: ["register"] }, "ana"),
    effect("granted", { identity: "beto", tools: ["sales"] }, "ana"),
    effect("removed", { identity: "beto" }, "ana"),
    effect("granted", { identity: "beto", tools: ["sales"] }, "ana"),
    effect("kit-set", { version: 2, holder: "beto", kit }, "ana"),
    effect("assistant-enabled", { owner: "beto", name: "Nora" }, "ana"),
    effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "sales", acts: ["register"] }] }, "beto"),
    effect("mind-card-assigned", { mind: "assistant:beto", card: "fake", version: "v1", capabilities: [] }, "ana"),
    effect(
      "journey-opened",
      { goal: "Anotar", kit: [{ tool: "sales", acts: ["register"] }] },
      "assistant:beto",
      [],
      "j1",
    ),
    effect("journey-closed", { outcome: "done", summary: "Anotado", references: [] }, "assistant:beto", [], "j1"),
    effect("assistant-kit-set", { version: 2, owner: "beto", kit }, "beto"),
    effect("journey-opened", { version: 2, goal: "Seguir", kit }, "assistant:beto", [], "j2"),
  ].map((event, index) => shop.read({ ...event, id: `mixed-${index}`, seq: index + 1, at: index }));
  const file = join(home(), "journal.sqlite");
  open(file).close();
  const db = new DatabaseSync(file);
  for (const event of events)
    db.prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)").run(
      event.seq,
      event.id,
      event.at,
      event.kind,
      event.by,
      JSON.stringify(event.cause),
      JSON.stringify(event.data),
      event.process ?? null,
    );
  db.close();
  const journal = open(file);
  const state = journal.watch("mixed", emptyHouse, houseStep, "kit-v2");
  journal.restore();
  const expected = events.reduce(houseStep, emptyHouse);
  expect(state()).toEqual(expected);
  const registry = [{ id: "sales", acts: { register: {}, added: {}, visual: { needs: ["sees" as const] } } }];
  expect(effectiveKit(state(), "assistant:beto", registry, "j1")).toEqual([]);
  expect(effectiveKit(state(), "assistant:beto", registry, "j2")).toEqual([
    { tool: "sales", acts: ["register", "added"] },
  ]);
  expect(allowedAct(state(), "beto", "payments", "receive")).toBe(false);
  journal.append(effect("kit-set", { version: 2, holder: "beto", kit: selectionKit([]) }, "ana"), 20);
  expect(effectiveKit(state(), "assistant:beto", registry, "j2")).toEqual([]);
  const after = state();
  journal.close();
  const reopened = open(file);
  const restored = reopened.watch("mixed", emptyHouse, houseStep, "kit-v2");
  reopened.restore();
  expect(restored()).toEqual(after);
  expect(reopened.replay(emptyHouse, houseStep)).toEqual(after);
  expect(reopened.replay<unknown[]>([], (all, event) => (event.seq <= events.length ? [...all, event] : all))).toEqual(
    events,
  );
});
it("maps old tool scope explicitly, never to its whole new program, and refuses ambiguous or reused ids", () => {
  const migration = {
    version: 1,
    scopes: [{ from: "products", program: "sales", tool: "products" }],
    actions: [],
    retired: [],
  };
  expect(migrateKit(selectionKit([{ kind: "tool", program: "products", tool: "products" }]), migration)).toEqual(
    selectionKit([{ kind: "tool", program: "sales", tool: "products" }]),
  );
  expect(() => checkKitMigration({ ...migration, scopes: [...migration.scopes, ...migration.scopes] }, [])).toThrow(
    "Ambiguous",
  );
  const from = { kind: "action" as const, program: "sales", tool: "products", action: "create" };
  const to = { ...from, action: "new" };
  const rename = { version: 2, scopes: [], actions: [{ from, to }], retired: [from] };
  expect(migrateKit(selectionKit([from]), rename)).toEqual(selectionKit([to]));
  expect(() =>
    checkKitMigration(rename, [{ id: "sales", actionTools: { new: "products" }, acts: { new: {} } }]),
  ).not.toThrow();
  expect(() => checkKitMigration(rename, [])).toThrow("target");
  expect(() =>
    checkKitMigration(rename, [{ id: "sales", actionTools: { create: "products" }, acts: { create: {} } }]),
  ).toThrow("reused");
  expect(() => checkKitMigration({ ...rename, actions: [{ from, to: { ...to, program: "other" } }] }, [])).toThrow(
    "target",
  );
});
it("adapts old writer calls to V2 while retaining restrictions on the granted tools", () => {
  const journal = open(join(home(), "journal.sqlite"));
  journal.append(effect("house-created", {}, "ana"), 1);
  journal.append(effect("granted", { identity: "beto", tools: ["sales"] }, "ana"), 2);
  journal.append(effect("kit-set", { holder: "beto", tool: "sales", acts: ["register"] }, "ana"), 3);
  journal.append(effect("granted", { identity: "beto", tools: ["sales", "payments"] }, "ana"), 4);
  const versions = journal.replay<number[]>([], (all, event) => {
    if (event.kind !== "granted" && event.kind !== "kit-set") return all;
    return [...all, "version" in event.data ? event.data.version : 1];
  });
  expect(versions).toEqual([2, 2, 2]);
  const house = journal.replay(emptyHouse, houseStep);
  expect(allowedAct(house, "beto", "sales", "register")).toBe(true);
  expect(allowedAct(house, "beto", "sales", "added")).toBe(false);
});
