import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { humanState } from "../src/web/client/state.ts";
import { projectViewPanel } from "../src/web/client/view-projection.ts";
import { transientFrame } from "../src/interaction/transient-frame.ts";
import { program, surface } from "./fixtures/view-program.ts";

const application = compile(Notebook);
const validate = (id: string, input: unknown) => application.validateInput(id, input).valid;
function readyState() {
  const store = humanState(surface);
  store.update({ availability: { contractDigest: surface.contractDigest,
    journeys: Object.fromEntries(surface.journeys.map(item => [item.id, { dependenciesReady: true, blockers: [] }])) } });
  return store;
}

test("Declared editor preserves canonical submit semantics for both button and form Enter", () => {
  const store = readyState(); store.update({ view: "create", draft: { title: "Title", body: "Body" } });
  const panel = projectViewPanel(program, program.journeys[2], program.views[3], surface, store.get(), validate);
  assert.equal(panel.frame.content.kind, "form");
  assert.equal(panel.frame.content.submit, program.journeys[2].id);
  assert.deepEqual(panel.frame.content.fields.map(item => item.name), ["title", "body"]);
  assert.deepEqual(panel.frame.bottom.primary?.intent, { kind: "journey", journey: program.journeys[2].id });
  assert.equal(panel.frame.bottom.primary?.label, "Create note");
  assert.deepEqual(transientFrame(panel.frame, false).top.leading?.intent, { kind: "close" });
});

test("A declared context preserves all authorized facts when its title is an authored identity", () => {
  const store = readyState(); store.update({ view: "detail", selectedId: "existing",
    detail: { id: "existing", version: 1, facts: { title: "Actual title", body: "Actual body", state: "active", secret: "Never expose" } } });
  const panel = projectViewPanel(program, program.journeys[1], program.views[2], surface, store.get(), validate);
  assert.equal(panel.frame.top.title, "Note");
  assert.equal(panel.frame.content.kind, "context");
  assert.deepEqual(panel.frame.content.details.fields, ["title", "body", "state"]);
  assert.deepEqual(panel.frame.content.details.facts, { title: "Actual title", body: "Actual body", state: "active" });
  assert.deepEqual(panel.frame.content.actions, [], "this finite program does not bind update journeys");
});

test("Review and recovery remain canonical and never inherit editable View outputs", () => {
  for (const recovery of [false, true]) {
    const store = readyState(); store.update({ view: recovery ? "recovery" : "review", uncertain: recovery,
      mutationId: program.journeys[2].id, prepared: { id: "original", runId: "run", journeyId: program.journeys[2].id,
        object: { id: "new", type: "note", expectedVersion: 0 }, facts: { title: "Title", body: "Body", state: "active" },
        confirmationDigest: "original-digest" } });
    const panel = projectViewPanel(program, program.journeys[2], program.views[3], surface, store.get(), validate);
    assert.equal(panel.frame.content.kind, "review");
    assert.deepEqual(panel.frame.bottom.primary?.intent, { kind: "accept" });
    assert.equal(panel.locked, recovery);
    assert.deepEqual(panel.frame.top.trailing?.[0]?.intent, recovery ? { kind: "recover" } : undefined);
    assert.deepEqual(panel.frame.bottom.secondary?.intent, recovery ? undefined : { kind: "back" });
  }
});
