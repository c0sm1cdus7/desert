import { afterEach, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Type, type TSchema } from "@sinclair/typebox";
import { MemoryHouseKeys, type HouseKeyProvider } from "./custody/house-keys.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
import { startHouse, type HouseOptions } from "../../programs/house-runtime.ts";
import { shop, shopRegistry, shopSlices, type Shop } from "../../../tests/support/shop.ts";
import { containing } from "../../../tests/support/custody-files.ts";
import { toolAct } from "../../tools/act-definition.ts";
import fixture from "../../../tests/support/custody-ac07248.json" with { type: "json" };
// Only the filename changes: the real vault, cipher, provider, journal and history inspection execute.
vi.mock("./secret-vault.ts", async importOriginal => {
  const { SecretVault } = await importOriginal<typeof import("./secret-vault.ts")>();
  return {
    SecretVault: class extends SecretVault<Shop> {
      constructor(file: string, schema: TSchema, keys?: HouseKeyProvider) {
        super(join(dirname(file), "fixture.sqlite"), schema, keys);
      }
    },
  };
});
const homes: string[] = [];
const opened: { close(): void }[] = [];
afterEach(() => {
  opened.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const options: HouseOptions<Shop> = {
  by: "shop",
  words: shop,
  slices: shopSlices,
  creation: { admin: "ana", assignments: [] },
  registry: [
    ...shopRegistry,
    {
      id: "vault",
      purpose: "Dato inventado",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: { set: toolAct(Type.Object({ value: Type.String({ secret: true }) }), () => ({ status: "accepted" })) },
    },
  ],
};
function previous(exposed = false) {
  const home = mkdtempSync(join(tmpdir(), "custody-ac07248-test-"));
  homes.push(home);
  const db = new DatabaseSync(join(home, "journal.sqlite"));
  db.exec(`create table events (seq integer primary key, id text not null unique, at integer not null,
    kind text not null, by text not null, cause text not null, data text not null, process text);
    create table snapshots (name text primary key, state blob not null);`);
  for (const row of fixture.events) {
    const data = exposed ? row.data.replace(/secret:[0-9a-f-]{36}/gu, "SINTETICO_EXPUESTO") : row.data;
    db.prepare("insert into events values (?,?,?,?,?,?,?,?)").run(
      row.seq,
      row.id,
      row.at,
      row.kind,
      row.by,
      row.cause,
      data,
      row.process,
    );
  }
  for (const row of fixture.snapshots)
    db.prepare("insert into snapshots values (?,?)").run(row.name, Buffer.from(row.state, "base64"));
  db.close();
  const vault = new DatabaseSync(join(home, "fixture.sqlite"));
  vault.exec("create table secrets (id text primary key, value text not null unique)");
  for (const row of fixture.material) vault.prepare("insert into secrets values (?,?)").run(row.id, row.value);
  vault.close();
  return home;
}
it("abre y cifra una casa escrita por ac07248, conserva hechos e ids y vuelve a abrir", () => {
  const home = previous(),
    keys = new MemoryHouseKeys();
  expect(() => startHouse(home, options)).toThrow("E-CUSTODY-PROVIDER");
  const house = startHouse(home, { ...options, secretKeys: keys });
  opened.push(house);
  expect(house.tools.state().house.admin).toBe("ana");
  const facts = house.journal.replay<string[]>([], (all, event) => [...all, event.id]);
  expect(facts.slice(0, fixture.events.length)).toEqual(fixture.events.map(event => event.id));
  expect(containing(home, "ANTERIOR_SINTETICO")).toEqual([]);
  house.close();
  const file = join(home, "fixture.sqlite");
  expect(containing(home, "ANTERIOR_SINTETICO")).toEqual([]);
  const custody = new SecretCustody(file, realpathSync(home), keys);
  opened.push(custody);
  expect(custody.ids()).toEqual(fixture.material.map(row => row.id));
  custody.close();
  const reopened = startHouse(home, { ...options, secretKeys: keys });
  opened.push(reopened);
  expect(reopened.tools.state().house.admin).toBe("ana");
});
it("la revisión B rechaza historia expuesta antes de abrir o adoptar la bóveda anterior", () => {
  const home = previous(true),
    file = join(home, "fixture.sqlite"),
    before = readFileSync(file);
  expect(() => startHouse(home, { ...options, secretKeys: new MemoryHouseKeys() })).toThrow(
    expect.objectContaining({ code: "E-SECRET-HISTORY" }),
  );
  expect(readFileSync(file)).toEqual(before);
});
