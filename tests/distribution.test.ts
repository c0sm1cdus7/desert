import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";

function definitions() {
  return [
    { id: "service", kind: "controller", product: "notebook", runtime: "node", storage: "postgresql", serves: ["human", "agent"], provides: ["notes"] },
    ...["svelte-web", "swiftui-ios", "terminal-cli"].map(renderer => ({
      id: renderer, kind: "client", product: "notebook", surface: "human", renderer,
      bindings: [{ dependency: "notes", kind: "remote", service: "service" }],
    })),
  ];
}

test("web, iOS and CLI pin the same human contract but remain unbuilt", () => {
  const app = compile(Notebook);
  const plans = app.planDistributions(definitions());
  assert.equal(plans.length, 4);
  for (const plan of plans) {
    assert.equal(plan.status, "unbuilt");
    assert.equal(plan.contractDigest, app.digest);
    assert.equal(Object.isFrozen(plan), true);
    if (plan.kind === "client") assert.strictEqual(plan.interaction, app.surface("human"));
  }
  assert.equal("build" in app, false);
});

test("duplicate distributions and missing controllers are not guessed", () => {
  const source = definitions();
  assert.throws(() => compile(Notebook).planDistributions([...source, source[1]]), /Duplicate distribution/);
  assert.throws(() => compile(Notebook).planDistributions(source.slice(1)), /Unknown controller/);
});

test("a CLI human renderer cannot consume the agent surface", () => {
  const source = definitions();
  Object.assign(source[3]!, { surface: "agent" });
  assert.throws(() => compile(Notebook).planDistributions(source), /Human renderer requires human surface/);
});

test("a client cannot refer to a service that does not serve its surface", () => {
  const source = definitions();
  Object.assign(source[0]!, { serves: ["agent"] });
  assert.throws(() => compile(Notebook).planDistributions(source), /Controller does not serve/);
});

test("foreign products, unknown renderers and unknown distribution semantics fail closed", () => {
  for (const patch of [{ product: "another-product" }, { renderer: "invented" }, { offlineWrites: true }]) {
    const source = definitions();
    Object.assign(source[1]!, patch);
    assert.throws(() => compile(Notebook).planDistributions(source), /Foreign product|Invalid distribution/);
  }
});
