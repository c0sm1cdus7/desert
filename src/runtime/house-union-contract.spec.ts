// The custody and the house contract as one contract: kits, a tool's mind, scenes and a credential, through reopening;
// and a registry written by the custody alone (3e69d44) folds the same in the joined tree.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import previous from "../../tests/support/custody-3e69d44.json" with { type: "json" };
import { adapterProgram, call, imported, validity } from "../../tests/support/declared-adapters.ts";
import { fakeKeychain } from "../../tests/support/fake-keychain.ts";
import "../../tests/support/fixture-vault.ts";
import { MacOSHouseKeys } from "../../tests/support/retired-macos/macos-house-keys.ts";
import { shop, shopRegistry, shopSlices, type Shop } from "../../tests/support/shop.ts";
import { effect } from "../house/facts.ts";
import { ids } from "../house/ids.ts";
import { explicitKit, programKit, selectionKit } from "../house/kit-selection.ts";
import { mindOf } from "../house/kit.ts";
import type { HouseOptions } from "../house/state.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { toolAct } from "../tools/act-definition.ts";
import type { Tool } from "../tools/tool-contract.ts";
import { startHouse } from "./house-runtime.ts";
const homes: string[] = [];
const houses: { close(): void }[] = [];
afterEach(() => {
  houses.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const empty = Type.Object({});
const valid = (result: unknown): boolean => Value.Check(validity, result) && result.valid;
/** The same synthetic tool the fixture was written with: one act without secrets, two with an invented credential. */
const vault: Tool<Shop> = {
  id: "vault",
  purpose: "Prueba sintética",
  targets: () => [],
  summary: () => "",
  view: () => "",
  acts: {
    plain: toolAct(empty, () => ({ status: "accepted", text: "Sin secretos" })),
    sign: toolAct(empty, async (_, context) => {
      const refs = await imported(context);
      if (!valid(await call(context, "inspect", refs))) return { status: "rejected", reason: "inválida" };
      const effects = [context.credentials.replace("signing", refs, context.credentials.revision("signing"))];
      return { status: "accepted", text: "Firmado", effects };
    }),
    use: toolAct(empty, async (_, context) => {
      const current = context.credentials.current("signing");
      const usable = current !== undefined && valid(await call(context, "inspect", current.refs));
      return usable ? { status: "accepted", text: "Usada" } : { status: "rejected", reason: "sin firma" };
    }),
  },
};
const optionsWith = (fake: ReturnType<typeof fakeKeychain>): HouseOptions<Shop> => ({
  by: "shop",
  projectionVersion: "union/1",
  words: shop,
  slices: shopSlices,
  registry: [...shopRegistry, vault],
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments", "vault"] }] },
  ...adapterProgram,
  secretKeys: new MacOSHouseKeys(fake.command),
});
const temporary = () => {
  const home = mkdtempSync(join(tmpdir(), "union-contract-"));
  homes.push(home);
  return home;
};
function opened(home: string, options: HouseOptions<Shop>) {
  const house = startHouse(home, options);
  houses.push(house);
  const act = async (by: string, act: string, input: unknown = {}, target = "vault") => {
    const result = house.tools.act({ act, target, input }, 0, by);
    return result.status === "processing" ? result.completion : result;
  };
  return { house, act };
}
const plain = (_key: string, value: unknown): unknown => {
  if (value instanceof Map) return [...value.entries()];
  return value instanceof Set ? [...value] : value;
};
const folded = (value: unknown): unknown => JSON.parse(JSON.stringify(value, plain));
const mind = mindOf("vault");
const outcome = async (rig: ReturnType<typeof opened>, by: string, act: string) => {
  const { status, reason } = await rig.act(by, act);
  return status === "accepted" ? "accepted" : `${status} · ${reason ?? ""}`;
};
const denied = `rejected · ${toolTexts.outsideKit}`;

it("casa con custodia: kits, mente, actos con y sin credencial, escenas; cierra y reabre igual", async () => {
  const home = temporary(),
    fake = fakeKeychain(),
    options = optionsWith(fake);
  let rig = opened(home, options);
  rig.house.bus.emit(effect("granted", { identity: "beto", tools: ["vault"] }, "ana"));
  rig.house.bus.emit(effect("kit-set", { holder: "beto", tool: "vault", acts: ["plain"] }, "ana"));
  rig.house.bus.emit(effect("kit-set", { holder: mind, tool: "vault", acts: ["sign", "use"] }, "ana"));
  for (const by of ["ana", "beto"]) await rig.act(by, "attend", { target: "vault" }, ids.self);
  const first = async () => ({
    ana: [await outcome(rig, "ana", "plain"), await outcome(rig, "ana", "sign"), await outcome(rig, "ana", "use")],
    beto: [await outcome(rig, "beto", "plain"), await outcome(rig, "beto", "sign"), await outcome(rig, "beto", "use")],
    mind: [await outcome(rig, mind, "plain"), await outcome(rig, mind, "sign"), await outcome(rig, mind, "use")],
  });
  expect(await first()).toEqual({
    ana: ["accepted", "accepted", "accepted"],
    beto: ["accepted", denied, denied],
    mind: [denied, "accepted", "accepted"],
  });
  rig.house.bus.emit(effect("kit-set", { holder: "beto", tool: "vault", acts: ["sign", "use"] }, "ana"));
  rig.house.bus.emit(effect("kit-set", { holder: mind, tool: "vault", acts: ["plain"] }, "ana"));
  expect([await outcome(rig, "beto", "plain"), await outcome(rig, "beto", "sign")]).toEqual([denied, "accepted"]);
  expect([await outcome(rig, mind, "plain"), await outcome(rig, mind, "use")]).toEqual(["accepted", denied]);
  const sceneOf = (by: string, input: unknown) => rig.act(by, "scene", input, ids.self);
  expect(await sceneOf("ana", { general: "Hay firma", to: { beto: "Te toca firmar" } })).toMatchObject({
    status: "accepted",
  });
  expect(await sceneOf(mind, { general: "La bóveda firmó", to: { ana: "Tu firma está" } })).toMatchObject({
    status: "accepted",
  });
  expect(await sceneOf(mind, { general: "x", to: { [mind]: "y" } })).toMatchObject({ status: "rejected" });
  const facts = rig.house.journal.replay<{ kind: string; by: string }[]>([], (all, event) => [...all, event]);
  expect(facts.filter(fact => fact.by === mind && fact.kind === "act")).toHaveLength(7);
  const probe = async () => [
    await outcome(rig, "ana", "use"),
    await outcome(rig, "beto", "use"),
    await outcome(rig, "beto", "plain"),
    await outcome(rig, mind, "plain"),
    await outcome(rig, mind, "use"),
  ];
  const kept = () => {
    const { house, tools } = rig.house.tools.state();
    return folded({ house, tools });
  };
  const before = { probe: await probe() };
  expect(before.probe).toEqual(["accepted", "accepted", denied, "accepted", denied]);
  const settled = kept();
  rig.house.close();
  rig = opened(home, options);
  expect(kept()).toEqual(settled);
  expect(await probe()).toEqual(before.probe);
  const { house } = rig.house.tools.state();
  expect([...house.scenes.keys()].sort()).toEqual(["ana", mind]);
  expect(house.scenes.get(mind)?.data.to).toEqual({ ana: "Tu firma está" });
  expect(house.kits.size).toBe(0);
  expect(house.selections).toEqual(
    new Map([
      ["ana", programKit(["sales", "payments", "vault"])],
      ["beto", explicitKit([{ tool: "vault", acts: ["sign", "use"] }])],
      [mind, explicitKit([{ tool: "vault", acts: ["plain"] }])],
    ]),
  );
});

it("un registro escrito por la custodia sola (3e69d44) se pliega igual en el árbol unido", async () => {
  const home = temporary();
  const db = new DatabaseSync(join(home, "journal.sqlite"));
  for (const sql of previous.journal.schema) db.exec(sql);
  type Cell = string | number | null | Readonly<{ base64: string }>;
  const insert = (table: string, rows: readonly Readonly<Record<string, Cell>>[]) => {
    for (const row of rows) {
      const values = Object.values(row).map(cell =>
        cell !== null && typeof cell === "object" ? Buffer.from(cell.base64, "base64") : cell,
      );
      db.prepare(`insert into ${table} values (${values.map(() => "?").join(",")})`).run(...values);
    }
  };
  const { journal_identity: identity, events, snapshots } = previous.journal.tables;
  insert("journal_identity", identity);
  insert("events", events);
  insert("snapshots", snapshots);
  db.close();
  writeFileSync(join(home, "fixture.sqlite"), Buffer.from(previous.custody, "base64"));
  const fake = fakeKeychain();
  for (const [account, value] of Object.entries(previous.keychain))
    fake.saved.set(account, Buffer.from(value, "base64"));
  const rig = opened(home, optionsWith(fake));
  // desert/1 (custody alone) differs from the joined base version: both saved folds are rebuilt from the journal.
  expect(rig.house.storageNotices().map(notice => notice.reason.includes("calculation version changed"))).toEqual([
    true,
    true,
  ]);
  const { house, wakeOwners, ...rest } = rig.house.tools.state();
  expect([...wakeOwners]).toEqual([['attention:["beto","vault"]', "beto"]]);
  const {
    kits,
    scenes,
    names,
    removed,
    assistants,
    mindAssignments,
    mindCards,
    minds,
    journeys,
    modelCalls,
    selections,
    kitLayout,
    identities,
    rules,
    devices,
    doors,
    ...older
  } = house;
  expect(Object.hasOwn(older, "channels")).toBe(false);
  const previousHouse = Object.fromEntries(Object.entries(previous.fold.house).filter(([key]) => key !== "channels"));
  expect(folded({ ...rest, house: older })).toEqual({ ...previous.fold, house: previousHouse });
  expect(mindCards).toEqual(new Map());
  expect(identities).toBe(false);
  expect(rules).toEqual({ versions: new Map(), active: new Map(), approved: new Map(), retired: new Map() });
  expect(devices).toEqual({ devices: new Map(), executions: new Map() });
  expect(doors).toEqual({ initialized: false, codes: new Map(), keys: new Map(), invitations: new Map() });
  expect(kitLayout).toEqual({});
  expect(selections).toEqual(
    new Map([
      ["ana", selectionKit(["sales", "payments", "vault"].map(program => ({ kind: "tool", program, tool: program })))],
      ["beto", selectionKit([{ kind: "tool", program: "vault", tool: "vault" }])],
    ]),
  );
  expect([kits.size, scenes.size, names.size, removed.size]).toEqual([0, 0, 0, 0]);
  expect([assistants.size, mindAssignments.size, journeys.size, modelCalls.size]).toEqual([0, 0, 0, 0]);
  expect(minds).toEqual({ turns: new Map(), scenes: new Map(), messages: [] });
  expect([await outcome(rig, "ana", "use"), await outcome(rig, "beto", "use")]).toEqual(["accepted", "accepted"]);
  expect(await outcome(rig, mind, "use")).toBe(denied);
});
