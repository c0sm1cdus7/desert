import test from "node:test";
import assert from "node:assert/strict";
import { labels } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { application, LabeledItems, Item, CreateItem, surface, program } from "./fixtures/labels.ts";
import { compileViewProgram } from '../src/views/program.ts';
import type { ProductDefinition } from "../src/contracts.ts";
import { sameFact } from "../src/fact-values.ts";
import { fieldValues, invalidInputs } from "../src/testing/values.ts";
import { presentFacts, factState, presentFact } from "../src/interaction/fact-presentation.ts";
import { surfaceFrame } from "../src/interaction/surface-frame.ts";
import { Components, defineView, viewPorts, activityInputs } from "../src/index.ts";
import { activityIndex } from "../src/activities/activity-index.ts";
import { FixtureMessages } from "./fixtures/messages.ts";

test("labels are a bounded unique array, preserve casing/order and accept explicit empty", () => {
  assert.deepEqual(labels(), { kind: "labels", maxItems: 12, maxLength: 64 });
  assert.ok(Object.isFrozen(labels()));
  const values = [[], ["Desert"], ["Desert", "desert"], ["B", "A"], ["a  b"], ["🌵".repeat(64)],
    Array.from({ length: 12 }, (_, index) => `Project ${index}`)];
  for (const projects of values) {
    const before = structuredClone(projects);
    assert.equal(application.validateInput(CreateItem.command.id, { title: "Task", projects }).valid, true);
    assert.deepEqual(projects, before, "validation must not trim, sort or normalize intent");
  }
});

test("noncanonical labels, scalar encodings and missing input are rejected without coercion", () => {
  const invalid = [null, "", "A,B", '["A","B"]', {}, [null], [1], [[]], [""], [" "], [" A"],
    ["A "], ["A\n"], ["\u00a0A"], ["A", "A"], ["A", " A"], ["🌵".repeat(65)],
    Array.from({ length: 13 }, (_, index) => `Project ${index}`)];
  for (const projects of invalid) {
    assert.equal(application.validateInput(CreateItem.command.id, { title: "Task", projects }).valid, false,
      `unexpected accepted labels: ${JSON.stringify(projects)}`);
  }
  assert.equal(application.validateInput(CreateItem.command.id, { title: "Task" }).valid, false);
});

test("labels limits are one typed closed field contract, with tighter constraints allowed", () => {
  assert.deepEqual(labels({ maxItems: 2, maxLength: 4 }), { kind: "labels", maxItems: 2, maxLength: 4 });
  for (const value of [{ maxItems: 0 }, { maxItems: 13 }, { maxLength: 65 }, { maxLength: 0 },
    { maxItems: 1.2 }, { maxLength: Infinity }, { color: "red" }, { defaults: [] }, null]) {
    assert.throws(() => Reflect.apply(labels, null, [value]), /INVALID_LABELS_DEFINITION/);
  }
});

test("labels cannot be used as scalar guards, literals or text collection values", () => {
  const change = (mutate: (value: ProductDefinition) => void) => {
    const value = structuredClone(LabeledItems) as ProductDefinition; mutate(value); return () => compile(value);
  };
  assert.throws(change(value => {
    const mutation = value.journeys!.find(item => item.kind === "mutation")!;
    if (mutation.kind === "mutation" && mutation.command.kind === "create") {
      mutation.command.values.projects = { kind: "literal", value: "A,B" };
    }
  }), /Labels assignment requires input/);
  const value=structuredClone(LabeledItems) as ProductDefinition;
  const read=value.journeys!.find(item=>item.kind==='read')!;
  if(read.kind==='read')read.collection.push('projects');
  assert.throws(()=>compileViewProgram(program,compile(value).surface('human')),/LABELS_CANNOT_BE_COLLECTION_TEXT/);
});

test("fact comparison and derived witnesses handle labels as arrays, not asset handles", () => {
  assert.equal(sameFact(["A", "B"], ["A", "B"]), true);
  assert.equal(sameFact(["A"], ["B"]), false);
  assert.equal(sameFact(["A", "B"], ["B", "A"]), false);
  assert.equal(sameFact([], []), true);
  assert.equal(sameFact([], undefined), false);
  for (const projects of fieldValues(labels(), 0)) {
    assert.equal(application.validateInput(CreateItem.command.id, { title: "Task", projects }).valid, true);
  }
  for (const input of invalidInputs(Item, CreateItem.command, { title: "Task", projects: ["A"] })) {
    assert.equal(application.validateInput(CreateItem.command.id, input).valid, false);
  }
});

test("published tags preserve Unicode and cannot be substituted for asset or scalar presentation", () => {
  const projects = ["🌵".repeat(64), "A"];
  const content = presentFacts(surface, "labeled-item", ["title", "projects"], { title: "Task", projects });
  assert.deepEqual(content.tags, ["projects"]);
  assert.deepEqual(content.facts.projects, projects);
  const frame = { version: "desert.surface-frame/6", kind: "context", top: { title: "Task" }, content, bottom: {} };
  assert.doesNotThrow(() => surfaceFrame(frame));
  assert.equal(factState([]), "empty");
  assert.equal(presentFact([]), "Empty");
  assert.equal(presentFact(projects), "Labels", "never stringify a structured value into display text");
  for (const patch of [{ tags: [] }, { tags: ["title"] }, { tags: ["projects"], images: ["projects"] },
    { tags: ["projects"], multiline: ["projects"] }, { tags: ["missing"] }, { tags: ["projects", "projects"] },
    { facts: { title: "Task", projects: "A" } }, { facts: { title: "Task", projects: { kind: "asset", reference: "e7000000-0000-4000-8000-000000000001" } } }]) {
    assert.throws(() => surfaceFrame({ ...frame, content: { ...content, ...patch } }), /INVALID_SURFACE_FRAME/);
  }
});

test("scalar Activity answers cannot carry labels until their typed step contract supports arrays", () => {
  const ports = viewPorts({ inputs: { draft: "form", prepared: "context" }, outputs: [] });
  const Draft = defineView({ name: "labels-draft", content: [Components.Form({ input: ports.inputs.draft })] });
  const Review = defineView({ name: "labels-review", content: [Components.Context({ input: ports.inputs.prepared })] });
  const catalog = activityIndex(application, { messages: FixtureMessages, journeys: [CreateItem], views: [Draft, Review] });
  const inputs = activityInputs(CreateItem);
  assert.throws(() => catalog.define({ journey: CreateItem, steps: [
    { view: Draft, inputs: [inputs.title, inputs.projects] },
  ], review: Review }), /ACTIVITY_LABELS_NOT_INSTALLED/);
});
