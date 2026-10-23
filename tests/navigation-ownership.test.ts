import assert from "node:assert/strict";
import test from "node:test";
import { composeProduct, humanSurface, compile as compileProduct } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../products/notebook/journeys.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import { viewScopes } from "../src/web/client/view-scopes.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { navigationOwnershipFixture } from "./fixtures/navigation-ownership.ts";
import { program } from "./fixtures/view-program.ts";

test("human exposure rejects every authored navigation field by presence", () => {
  const exposure = { id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" };
  for (const key of ["navigation", "entry", "primaryAction", "subjectActions"]) {
    for (const value of [undefined, null, ReadNote]) {
      assert.throws(() => Reflect.apply(humanSurface, undefined, [{ ...exposure, [key]: value }]),
        { message: "DUPLICATE_NAVIGATION_OWNER" });
    }
  }
});

test("A View program owns Home without a second entry on human exposure", async t => {
  const { application, surface, composition } = navigationOwnershipFixture();
  assert.equal(Object.hasOwn(surface, "navigation"), false);
  assert.equal(compileViewProgram(program, surface).entry, "home");
  assert.equal(composeProduct(composition).viewProgram.entry, "home");
  const model = viewProgramModel(program, surface, (id, input) => application.validateInput(id, input).valid);
  t.after(() => model.stop());
  assert.equal(model.snapshot().activeDestination, "home");
  assert.equal(model.snapshot().resolved.top?.title, "Home");
  assert.equal(model.snapshot().state.creationJourneyId, null);
  await assert.doesNotReject(() => buildHumanModule(compileProduct(composeProduct(composition)), "human"));
});

test("Read scopes derive their actions from bindings, not exposed operations", t => {
  const { application, surface } = navigationOwnershipFixture();
  assert.ok(surface.journeys.some(journey => journey.id === ArchiveNote.id));
  const scopes = viewScopes(program, surface, (id, input) => application.validateInput(id, input).valid);
  t.after(() => scopes.forEach(scope => scope.model.stop()));
  const read = scopes.find(scope => scope.scope.kind === "read")?.scope;
  assert.equal(read?.kind, "read");
  if (read?.kind !== "read") throw new Error("Missing declared read scope");
  assert.equal(read.read.id, ReadNote.id);
  assert.deepEqual(read.creations.map(journey => journey.id), [CreateNote.id]);
  assert.equal(read.primaryCreation?.id, CreateNote.id);
  assert.deepEqual(read.subjectActions, [], "Exposure alone must not grant an unbound Archive action");
});

test("Even agreeing standalone navigation cannot be attached to a View program", () => {
  const standalone = { ...compile(Notebook).surface("human"),
    navigation: { entry: ReadNote.id, primaryAction: CreateNote.id, subjectActions: [ArchiveNote.id] } };
  const sameEntry = { ...program, entry: "notes" };
  assert.equal(standalone.navigation?.entry, ReadNote.id);
  assert.equal(sameEntry.destinations.find(item => item.id === sameEntry.entry)?.entryJourney, ReadNote.id);
  assert.throws(() => compileViewProgram(sameEntry, standalone), { message: "DUPLICATE_NAVIGATION_OWNER" });
  const { composition } = navigationOwnershipFixture();
  const surfaces = composition.surfaces.map(surface => surface.kind === "human"
    ? { ...surface, entry: ReadNote.id, primaryAction: CreateNote.id, subjectActions: [ArchiveNote.id] } : surface);
  assert.throws(() => composeProduct({ ...composition, surfaces } as never),
    /DUPLICATE_NAVIGATION_OWNER|INVALID_PRODUCT_COMPOSITION/);
});

test("Raw human surfaces reject partial and complete navigation triples, including wrong operation kinds", () => {
  const navigation = { entry: ReadNote.id, primaryAction: CreateNote.id, subjectActions: [ArchiveNote.id] };
  const keys = ["entry", "primaryAction", "subjectActions"] as const;
  const { composition } = navigationOwnershipFixture();
  for (let mask = 1; mask <= 7; mask++) {
    const partial = Object.fromEntries(keys.filter((_, index) => mask & (1 << index)).map(key => [key, navigation[key]]));
    const source = structuredClone(Notebook);
    const surfaces = source.surfaces.map(surface => surface.kind === "human" ? { ...surface, ...partial } : surface);
    assert.throws(() => compile({ ...source, surfaces }), `Partial navigation mask ${mask} must not be inferred`);
    const authoredSurfaces = composition.surfaces.map(surface => surface.kind === "human" ? { ...surface, ...partial } : surface);
    assert.throws(() => composeProduct({ ...composition, surfaces: authoredSurfaces } as never),
      `Partial navigation mask ${mask} cannot enter a composed product`);
  }
  for (const wrong of [{ ...navigation, entry: CreateNote.id },
    { ...navigation, primaryAction: ReadNote.id }, { ...navigation, subjectActions: [CreateNote.id] }]) {
    const source = structuredClone(Notebook);
    const surfaces = source.surfaces.map(surface => surface.kind === "human" ? { ...surface, ...wrong } : surface);
    assert.throws(() => compile({ ...source, surfaces }));
  }
});

test("A navigation-free exposure needs a View program; the builder cannot guess one", async () => {
  const { application, composition } = navigationOwnershipFixture();
  await assert.rejects(() => buildHumanModule(application, "human"));
  await assert.doesNotReject(() => buildHumanModule(compileProduct(composeProduct(composition)), "human"));
});
