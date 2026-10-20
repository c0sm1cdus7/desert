import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { notebookDefinition } from "./fixtures/notebook.ts";

function withDependencies() {
  return notebookDefinition();
}

test("journey projections include the resolved controller dependency", () => {
  const app = compile(withDependencies());
  for (const journey of app.surface("human").journeys) assert.deepEqual(journey.dependencies, ["notes"]);
});

test("missing explicit journey requirements do not mean offline allowed", () => {
  const source = withDependencies();
  assert.doesNotThrow(() => compile(source));
  Reflect.deleteProperty(source.journeys[0]!, "requires");
  assert.throws(() => compile(source), /Invalid definition/);
});

test("unknown controller references and wrong object authority are rejected", () => {
  const source = withDependencies();
  source.journeys[0]!.requires.controller = "missing";
  assert.throws(() => compile(source), /Unknown dependency/);
  source.journeys[0]!.requires.controller = "notes";
  source.dependencies[0]!.objects = [];
  assert.throws(() => compile(source), /Invalid definition|Controller does not own/);
});

test("transitive requirements cannot disappear from a journey projection", () => {
  const source = withDependencies();
  Object.assign(source, { dependencies: [
    { id: "notes", kind: "controller", objects: ["note"], requires: ["store"] },
    { id: "store", kind: "capability", requires: [] },
  ] });
  assert.deepEqual(compile(source).surface("human").journeys[0]!.dependencies, ["notes", "store"]);
});

test("dependency cycles and competing object controllers are rejected", () => {
  const cyclic = withDependencies();
  Object.assign(cyclic.dependencies[0]!, { requires: ["notes"] });
  assert.throws(() => compile(cyclic), /Dependency cycle/);
  const competing = withDependencies();
  competing.dependencies.push({ id: "another", kind: "controller", objects: ["note"], requires: [] });
  assert.throws(() => compile(competing), /Competing controllers/);
});
