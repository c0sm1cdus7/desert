import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";

function localDistribution() {
  return { id: "local", kind: "client", product: "notebook", surface: "human",
    renderer: "terminal-cli", bindings: [{ dependency: "notes", kind: "local", adapter: "notes-local" }] };
}

test("Notebook can bind its controller locally without declaring a remote service", () => {
  const app = compile(Notebook);
  const [plan] = app.planDistributions([localDistribution()]);
  assert.equal(plan!.status, "unbuilt");
  assert.equal(plan!.kind, "client");
  if (plan!.kind !== "client") throw new Error("Expected client plan");
  assert.equal(plan!.contractDigest, app.digest);
  assert.deepEqual(plan!.bindings, [{ dependency: "notes", kind: "local", adapter: "notes-local" }]);
  assert.ok(plan!.requirements.includes("local-adapter:notes-local"));
});

test("a remote binding must reference a service providing the exact dependency", () => {
  const service = { id: "server", kind: "controller", product: "notebook", runtime: "node",
    storage: "postgresql", serves: ["human"], provides: ["notes"] };
  const remote = { ...localDistribution(), bindings: [{ dependency: "notes", kind: "remote", service: "server" }] };
  assert.doesNotThrow(() => compile(Notebook).planDistributions([service, remote]));
  assert.throws(() => compile(Notebook).planDistributions([remote]), /Unknown controller/);
  assert.throws(() => compile(Notebook).planDistributions([{ ...service, provides: [] }, remote]), /does not provide/);
});

test("bindings must cover the complete dependency closure, with no guesses or extras", () => {
  const app = compile(Notebook);
  assert.doesNotThrow(() => app.planDistributions([localDistribution()]));
  for (const bindings of [[], [...localDistribution().bindings, ...localDistribution().bindings],
    [...localDistribution().bindings, { dependency: "invented", kind: "local", adapter: "anything" }]]) {
    assert.throws(() => app.planDistributions([{ ...localDistribution(), bindings }]), /Missing binding|Duplicate binding|Unused binding/);
  }
});

test("a mixed distribution binds a transitive dependency only used by archive", () => {
  const source = structuredClone(Notebook) as any;
  source.dependencies.push({ id: "archive-provider", kind: "capability", requires: ["archive-link"] },
    { id: "archive-link", kind: "capability", requires: [] });
  source.journeys[2].requires.dependencies = ["archive-provider"];
  const app = compile(source);
  const local = localDistribution();
  assert.throws(() => app.planDistributions([local]), /Missing binding/);
  const service = { id: "archive-server", kind: "controller", product: "notebook", runtime: "node",
    storage: "postgresql", serves: ["human"], provides: ["archive-provider", "archive-link"] };
  const mixed = { ...local, bindings: [...local.bindings,
    ...service.provides.map(dependency => ({ dependency, kind: "remote", service: service.id }))] };
  assert.doesNotThrow(() => app.planDistributions([service, mixed]));
  const journeys = app.surface("human").journeys;
  assert.deepEqual(journeys.find(journey => journey.id === "create-note")!.dependencies, ["notes"]);
  assert.deepEqual(journeys.find(journey => journey.id === "archive-note")!.dependencies,
    ["archive-link", "archive-provider", "notes"]);
});
