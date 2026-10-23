import test from "node:test";
import assert from "node:assert/strict";
import { labelsClient } from "./fixtures/client-labels.ts";
import { until } from "./fixtures/client-edit.ts";

test("create initializes structured labels and submits the exact array, not display text", async t => {
  const f = await labelsClient(t); f.model.create();
  assert.deepEqual(f.model.snapshot().draft, { title: "", projects: [] });
  f.model.edit("projects", "A,B"); assert.deepEqual(f.model.snapshot().draft.projects, []);
  f.model.edit("title", "New task");
  f.model.editLabels({ kind: "labels.change", control: "projects", values: ["A,B", "🌵".repeat(64)] });
  const frame = f.frame(); assert.ok(frame.content.kind === "form");
  const field = frame.content.fields.find(field => field.name === "projects");
  assert.ok(field?.primitive === "control.labels");
  assert.deepEqual(field.values, ["A,B", "🌵".repeat(64)]);
  assert.deepEqual(field.limits, { maxItems: 12, maxLength: 64 });
  assert.equal(frame.bottom.primary?.state, "ready");
  await f.model.invoke(f.create);
  assert.deepEqual(f.calls.find(call => call.operation === "prepare")?.body.input,
    { title: "New task", projects: ["A,B", "🌵".repeat(64)] });
  assert.deepEqual(f.model.snapshot().detail?.facts.projects, ["A,B", "🌵".repeat(64)]);
});

test("invalid arrays remain editable and cannot trigger prepare; item errors belong to the field", async t => {
  const f = await labelsClient(t); f.model.create();
  for (const values of [["🌵".repeat(65)], ["A", "A"], Array.from({ length: 13 }, (_, i) => `P${i}`)]) {
    f.model.editLabels({ kind: "labels.change", control: "projects", values });
    assert.deepEqual(f.model.snapshot().draft.projects, values);
    const frame = f.frame(); assert.ok(frame.content.kind === "form");
    assert.equal(frame.bottom.primary?.state, "unavailable");
    assert.ok(frame.content.fields.find(field => field.name === "projects")?.error);
    await f.model.invoke(f.create);
    assert.equal(f.calls.some(call => call.operation === "prepare"), false);
  }
  f.model.editLabels({ kind: "labels.change", control: "projects", values: [] });
  assert.equal(f.frame().bottom.primary?.state, "ready");
});

test("edit initializes the published array and newer writing survives in-flight acceptance", async t => {
  const f = await labelsClient(t); await f.model.select("item");
  assert.equal(f.model.startEdit(f.edit.id), true);
  assert.deepEqual(f.model.snapshot().draft.projects, ["Original"]);
  f.model.editLabels({ kind: "labels.change", control: "projects", values: ["Submitted"] });
  let resume!: () => void;
  f.state.beforeAccept = () => new Promise<void>(resolve => { resume = resolve; });
  const pending = f.model.invoke(f.edit); await until(() => Boolean(resume));
  f.model.editLabels({ kind: "labels.change", control: "projects", values: ["Newer unsent"] });
  resume(); await pending;
  assert.deepEqual(f.model.snapshot().draft.projects, ["Newer unsent"]);
  assert.deepEqual(f.state.facts.projects, ["Submitted"]);
  assert.equal(f.model.snapshot().view, "edit");
});
