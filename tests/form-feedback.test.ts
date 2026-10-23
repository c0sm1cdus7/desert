import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { humanProduct } from "../src/web/client/model.ts";
import { humanState } from "../src/web/client/state.ts";
import { presentFrame } from "../src/web/client/frame.ts";
import { blockedSnapshot } from "../src/web/client/connection.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { fieldFeedback } from "../src/web/client/field-feedback.ts";
import { notebookScope } from "./fixtures/notebook-scope.ts";

async function fixture(t: TestContext) {
  const definition = structuredClone(Notebook);
  Object.assign(definition.objects[0]!.facts.title!, { minLength: 2, maxLength: 3 });
  const application = compile(definition);
  const surface = application.surface("human") as HumanSurface;
  const validate = Object.assign((id: string, value: unknown) => application.validateInput(id, value).valid,
    { inspect: (id: string, value: unknown) => application.validateInput(id, value) });
  const ready = { contractDigest: surface.contractDigest, journeys: Object.fromEntries(surface.journeys.map(journey =>
    [journey.id, { dependenciesReady: true, blockers: [] }])) };
  const scope = notebookScope(surface);
  const model = humanProduct(surface, validate, { scope, reading: false, transport: {
    evidence: async () => ({ snapshot: ready, validForMs: 5000 }),
    call: async () => { throw new Error("NO_OPERATION_EXPECTED"); },
  } });
  t.after(() => model.dispose());
  await model.start();
  model.create();
  assert.equal(model.snapshot().view, "create");
  const frame = (connected = true) => presentFrame(surface, { ...model.snapshot(), view: "create",
    availability: connected ? ready : blockedSnapshot(surface, "unreachable") }, validate, scope);
  const fields = (connected = true) => {
    const content = frame(connected).content;
    assert.equal(content.kind, "form");
    return content.fields;
  };
  return { model, frame, fields, surface, validate };
}

test("untouched forms are quiet; edited fields explain invalidity and recover from corrections", async t => {
  const { model, frame, fields } = await fixture(t);
  assert.ok(fields().every(field => field.error === undefined));
  assert.equal(frame().bottom.primary?.state, "unavailable");
  model.edit("title", "a");
  assert.equal(fields()[0]!.error, "Enter at least 2 characters.");
  assert.equal(fields()[1]!.error, undefined, "an untouched sibling is not scolded");
  model.edit("title", "abcd");
  assert.equal(fields()[0]!.error, "Use no more than 3 characters.");
  model.edit("title", "💡💡");
  assert.equal(fields()[0]!.error, undefined, "code points, not UTF-16 units, determine validity");
  model.edit("body", "Content");
  assert.equal(frame().bottom.primary?.state, "ready");
  model.edit("body", "");
  assert.equal(fields()[1]!.error, "Enter a value.");
  assert.equal(frame().bottom.primary?.state, "unavailable");
});

test("unchanged contact reveals a blank field without revising the submitted value", async t => {
  const { model, fields } = await fixture(t);
  const revision = model.snapshot().draftRevision;
  model.edit("body", "");
  assert.equal(fields()[1]!.error, "Enter a value.");
  assert.equal(model.snapshot().draftRevision, revision);
  model.edit("unknown", "ignored");
  assert.equal(Object.hasOwn(model.snapshot().draft, "unknown"), false);
});

test("draft and field feedback survive closing and dependency loss without disabling editing", async t => {
  const { model, frame, fields } = await fixture(t);
  model.edit("title", "a");
  model.edit("body", "Unsent writing");
  const before = structuredClone(model.snapshot().draft);
  model.close();
  assert.deepEqual(model.snapshot().draft, before);
  assert.equal(fields(false)[0]!.error, "Enter at least 2 characters.");
  assert.equal(frame(false).bottom.primary?.state, "unavailable");
  model.create();
  model.edit("title", "OK");
  assert.equal(fields(false)[0]!.error, undefined);
  assert.equal(frame(false).bottom.primary?.state, "unavailable");
  assert.equal(frame().bottom.primary?.state, "ready");
  assert.equal(model.snapshot().draft.body, "Unsent writing");
});

test("field presentation consumes validator issues, never runs its own constraint comparison", async t => {
  const { surface } = await fixture(t);
  const scope = notebookScope(surface);
  const state = { ...humanState(surface, scope).get(), view: "create" as const,
    draft: { title: "a", body: "x" }, touchedFields: ["title"] };
  const validate = Object.assign(() => false, { inspect: () => ({ valid: false, issues: [
    { keyword: "maxLength", instancePath: "/title", params: { limit: 17 } },
  ] }) });
  const frame = presentFrame(surface, state, validate, scope);
  assert.equal(frame.content.kind, "form");
  assert.equal(frame.content.fields[0]!.error, "Use no more than 17 characters.");
});

test("feedback resolves required and escaped property paths without exposing unrelated diagnostics", () => {
  assert.deepEqual(fieldFeedback({ valid: false, issues: [
    { keyword: "required", instancePath: "", params: { missingProperty: "missing" } },
    { keyword: "maxLength", instancePath: "/slash~1and~0tilde", params: { limit: 1 } },
    { keyword: "minLength", instancePath: "/untouched", params: { limit: 5 } },
    { keyword: "minLength", instancePath: "/parent/child", params: { limit: 5 } },
  ] }, ["missing", "slash/and~tilde", "parent"]), {
    missing: "Enter a value.", "slash/and~tilde": "Use no more than 1 character.",
  });
  assert.deepEqual(fieldFeedback({ valid: true, issues: [] }, ["missing"]), {});
});

test("only declared labels inputs may associate item diagnostics with their owning field", () => {
  const validation = { valid: false, issues: [
    { keyword: "maxLength", instancePath: "/projects/0", params: { limit: 64 } },
    { keyword: "maxLength", instancePath: "/labels~1and~0more/12", params: { limit: 32 } },
    { keyword: "maxLength", instancePath: "/parent/0", params: { limit: 3 } },
    { keyword: "maxLength", instancePath: "/nested/0/private", params: { limit: 2 } },
    { keyword: "maxLength", instancePath: "/named/item", params: { limit: 1 } },
  ] };
  const touched = ["projects", "labels/and~more", "parent", "nested", "named"];
  assert.deepEqual(fieldFeedback(validation, touched), {});
  assert.deepEqual(fieldFeedback(validation, touched, ["projects", "labels/and~more", "nested", "named"]), {
    projects: "Use no more than 64 characters.", "labels/and~more": "Use no more than 32 characters.",
  });
});
