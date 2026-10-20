import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { humanProduct } from "../src/web/client/model.ts";
import { Notebook } from "../products/notebook/product.ts";

for (const origin of ["list", "detail"] as const) {
  test(`primary review Back returns to the composer, then cancellation returns to ${origin}`, async t => {
    const definition: ProductDefinition = structuredClone(Notebook);
    const human = definition.surfaces!.find(surface => surface.kind === "human")!;
    assert.equal(human.kind, "human");
    human.commit[human.primaryAction] = "review";
    const application = compile(definition), surface = application.surface("human") as HumanSurface;
    const model = humanProduct(surface, (id, input) => application.validateInput(id, input).valid);
    const record = { id: "existing-record", version: 1, facts: { title: "Existing", body: "Preserve context", state: "active" } };
    const ready = { contractDigest: surface.contractDigest, journeys: Object.fromEntries(surface.journeys.map(journey =>
      [journey.id, { dependenciesReady: true, blockers: [] }])) };
    let accepts = 0;
    t.mock.method(globalThis, "fetch", async (url: string) => {
      const operation = url.split("/").at(-1);
      let result: unknown;
      if (operation === "availability") result = { snapshot: ready, validForMs: 5000 };
      else if (operation === "begin") result = { id: "run" };
      else if (operation === "read") result = [record];
      else if (operation === "offer") result = { available: true };
      else if (operation === "prepare") result = { id: "intent", runId: "run", journeyId: model.primary.id,
        object: { id: "new-record" }, confirmationDigest: "confirmation", facts: { title: "Unfinished", body: "Keep me" } };
      else if (operation === "accept") { accepts++; throw new Error("Cancellation must never accept"); }
      else throw new Error(`Unexpected operation ${operation}`);
      return new Response(JSON.stringify(result));
    });
    try {
      await model.start();
      await new Promise<void>(resolve => {
        let unsubscribe = () => {};
        unsubscribe = model.subscribe(state => { if (state.loaded) { unsubscribe(); resolve(); } });
      });
      await model.select(record.id);
      if (origin === "list") model.back();
      model.create(); model.edit("title", "Unfinished"); model.edit("body", "Keep me");
      await model.invoke(model.primary);
      assert.equal(model.snapshot().view, "review");
      model.back();
      assert.equal(model.snapshot().view, "create", "review Back must return to its composer, not the outer origin");
      assert.equal(model.snapshot().prepared, null);
      assert.deepEqual(model.snapshot().draft, { title: "Unfinished", body: "Keep me" });
      model.back();
      assert.equal(model.snapshot().view, origin);
      assert.equal(model.snapshot().selectedId, record.id);
      assert.deepEqual(model.snapshot().detail, record);
      model.create(); model.close();
      assert.equal(model.snapshot().view, origin, "close follows the same creation-origin boundary");
      assert.deepEqual(model.snapshot().draft, { title: "Unfinished", body: "Keep me" });
      assert.deepEqual(model.snapshot().touchedFields, ["title", "body"]);
      assert.equal(accepts, 0);
    } finally { model.stop(); }
  });
}
