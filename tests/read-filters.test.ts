import assert from "node:assert/strict";
import test from "node:test";
import { readJourney } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { Notebook } from "../products/notebook/product.ts";
import { Note } from "../products/notebook/note.ts";
import { NotesController } from "../products/notebook/dependencies.ts";

const Active = readJourney("read-active", Note, {
  fields: ["title", "body"], collection: ["title"], where: { state: "active" },
  requires: { controller: NotesController, dependencies: [] },
});
const Archived = readJourney("read-archived", Note, {
  fields: ["title", "body"], collection: ["title"], where: { state: "archived" },
  requires: { controller: NotesController, dependencies: [] },
});
const Product = { ...Notebook, journeys: [...Notebook.journeys, Active, Archived],
  surfaces: Notebook.surfaces.map(surface => ({ ...surface, journeys: [...surface.journeys, Active.id, Archived.id],
    ...(surface.kind === "human" ? { language: { ...surface.language,
      journeys: { ...surface.language.journeys, [Active.id]: "Active", [Archived.id]: "Archived" } } } : {}) })) };

test("read predicates are validated against canonical fact names and values", () => {
  assert.ok(compile(Product));
  for (const where of [{ missing: "active" }, { state: "missing" }, { state: 1 }, { state: { equals: "active" } }]) {
    assert.throws(() => compile({ ...Product, journeys: [...Notebook.journeys, { ...Active, where }, Archived] }));
  }
});

test("read predicates apply to collections and direct subjects without exposing private filter facts", async t => {
  const cluster = postgresCluster();
  t.after(() => cluster.dispose());
  const host = await openLocalController(compile(Product), { ...await cluster.database(), roles: [NotesController.id] });
  t.after(() => host.close());
  const owner = await host.identities.issue("Filter owner");
  const session = host.connect(owner.token, "human");
  const create = await session.prepare((await session.begin("create-note")).id, { title: "Retained", body: "Private content" });
  const receipt = await session.accept(create.id, create.confirmationDigest);
  const id = receipt.object.id;
  const active = await session.begin(Active.id);
  const direct = await session.begin(Active.id, id);
  const archived = await session.begin(Archived.id);
  assert.deepEqual(await session.read(active.id), [{ id, version: 1, facts: { title: "Retained" } }]);
  assert.deepEqual(await session.read(archived.id), []);
  const archive = await session.prepare((await session.begin("archive-note", id)).id, {});
  await session.accept(archive.id, archive.confirmationDigest);
  assert.deepEqual(await session.read(active.id), []);
  assert.deepEqual(await session.read(direct.id), [], "a previously admitted detail read cannot bypass the current predicate");
  assert.deepEqual(await session.read(archived.id), [{ id, version: 2, facts: { title: "Retained" } }]);
  assert.deepEqual(await session.read((await session.begin(Archived.id, id)).id),
    [{ id, version: 2, facts: { title: "Retained", body: "Private content" } }]);
  const foreign = host.connect((await host.identities.issue("Other identity")).token, "agent");
  assert.deepEqual(await foreign.read((await foreign.begin(Archived.id)).id), []);
  await assert.rejects(foreign.begin(Archived.id, id), /NOT_FOUND/);
});
