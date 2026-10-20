import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";

const modes = { "create-note": "submit", "archive-note": "review" };
function definition(commit: Record<string, string>) {
  return { ...Notebook, surfaces: Notebook.surfaces.map(surface => surface.kind === "human" ? { ...surface, commit } : surface) };
}

test("human commit modes are explicit, projected and digest-bound without weakening acceptance", () => {
  const application = compile(definition(modes));
  const surface = application.surface("human");
  assert.deepEqual(Reflect.get(surface, "commit"), modes);
  assert.ok(Object.isFrozen(Reflect.get(surface, "commit")));
  assert.notEqual(application.digest, compile(definition({ ...modes, "create-note": "review" })).digest);
  for (const journey of surface.journeys) {
    if (journey.kind === "mutation") assert.equal(journey.confirmation, "prepared-effect");
  }
  assert.equal("commit" in application.surface("agent"), false);
});

test("every exposed mutation needs a known commit mode; reads and unknown journeys cannot have one", () => {
  for (const commit of [
    { "archive-note": "review" },
    { ...modes, "create-note": "automatic" },
    { ...modes, "read-note": "submit" },
    { ...modes, "delete-note": "submit" },
  ]) assert.throws(() => compile(definition(commit)));
});

test("Notebook authors creation without review and archival with review", () => {
  assert.deepEqual(Reflect.get(compile(Notebook).surface("human"), "commit"), modes);
});
