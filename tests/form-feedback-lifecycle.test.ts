import assert from "node:assert/strict";
import { test } from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { humanProduct } from "../src/web/client/model.ts";
import type { HumanSurface } from "../src/web/types.ts";

for (const newerDraft of [false, true]) {
  test(`successful creation ${newerDraft ? "retains newer" : "clears submitted"} draft contact state`, async t => {
    const application = compile(Notebook);
    const surface = application.surface("human") as HumanSurface;
    const ready = { contractDigest: surface.contractDigest, journeys: Object.fromEntries(surface.journeys.map(journey =>
      [journey.id, { dependenciesReady: true, blockers: [] }])) };
    const model = humanProduct(surface, (id, input) => application.validateInput(id, input).valid);
    let acceptStarted!: () => void, finishAcceptance!: () => void;
    const accepting = new Promise<void>(resolve => { acceptStarted = resolve; });
    const finish = new Promise<void>(resolve => { finishAcceptance = resolve; });
    t.mock.method(globalThis, "fetch", async (url: string) => {
      const operation = url.split("/").at(-1);
      let data: unknown = [];
      if (operation === "availability") data = { snapshot: ready, validForMs: 5000 };
      if (operation === "begin") data = { id: "run" };
      if (operation === "prepare") data = { id: "intent", runId: "run", journeyId: model.primary.id,
        object: { id: "record" }, confirmationDigest: "confirmation", facts: { title: "Saved", body: "Text" } };
      if (operation === "accept") {
        acceptStarted(); await finish;
        data = { id: "intent", object: { id: "record" } };
      }
      return new Response(JSON.stringify(data));
    });
    try {
      await model.start();
      await new Promise<void>(resolve => {
        let unsubscribe = () => {};
        unsubscribe = model.subscribe(state => {
          if (state.availability.journeys[model.primary.id]?.dependenciesReady) { unsubscribe(); resolve(); }
        });
      });
      model.create(); model.edit("title", "Saved"); model.edit("body", "Text");
      const invocation = model.invoke(model.primary);
      await accepting;
      if (newerDraft) model.edit("title", "Next draft");
      finishAcceptance(); await invocation;
      if (newerDraft) {
        assert.equal(model.snapshot().draft.title, "Next draft");
        assert.deepEqual(model.snapshot().touchedFields, ["title", "body"]);
        model.edit("title", "Saved");
        assert.equal(model.snapshot().draft.title, "Next draft", "departing editor cannot overwrite newer writing");
      } else {
        assert.deepEqual(model.snapshot().draft, {});
        assert.deepEqual(model.snapshot().touchedFields, []);
        model.edit("body", "Text");
        assert.deepEqual(model.snapshot().draft, {}, "late blur from the departing editor must not revive a saved draft");
        model.create();
        assert.deepEqual(model.snapshot().draft, { title: "", body: "" });
        assert.deepEqual(model.snapshot().touchedFields, []);
      }
    } finally { finishAcceptance(); model.stop(); }
  });
}
