import assert from "node:assert/strict";
import { test } from "node:test";
import { compile } from "../src/compile.ts";
import { activityIndex } from "../src/activities/activity-index.ts";
import { activityInputs } from "../src/activities/authoring.ts";
import { activityProgress } from "../src/activities/progress.ts";
import { Components, defineView } from "../src/views/components.ts";
import { viewPorts } from "../src/views/authoring-ports.ts";
import { Notebook } from "../products/notebook/product.ts";
import { CreateNote } from "../products/notebook/journeys.ts";
import { catalogFixture } from "./fixtures/module-catalog.ts";

const ports = viewPorts({ inputs: { draft: "form", prepared: "context" }, outputs: ["execute"] });
export const Title = defineView({ name: "title-step", content: [Components.Form({ input: ports.inputs.draft })] });
export const Body = defineView({ name: "body-step", content: [Components.Form({ input: ports.inputs.draft })] });
export const Review = defineView({ name: "review-step", content: [Components.Context({ input: ports.inputs.prepared })] });

function fixture() {
  const app = compile(Notebook), inputs = activityInputs(CreateNote);
  const catalog = activityIndex(app, { journeys: [CreateNote], views: [Title, Body, Review] });
  const plan = catalog.define({ journey: CreateNote, steps: [
    { view: Title, inputs: [inputs.title] },
    { view: Body, inputs: [inputs.body], when: { input: inputs.title, comparison: "equals", value: "Detailed" } },
    { view: Body, inputs: [inputs.body], when: { input: inputs.title, comparison: "not-equals", value: "Detailed" } },
  ], review: Review });
  return { app, catalog, plan, inputs };
}

test("typed activity references compile to a closed installed conditional plan", () => {
  const { plan } = fixture();
  assert.equal(plan.journey, CreateNote.id);
  assert.deepEqual(activityProgress(plan, {}, []), { activeSteps: [0], completedSteps: [], nextStep: 0, input: {} });
  assert.deepEqual(activityProgress(plan, { "0": { title: "Detailed" } }, [0]), {
    activeSteps: [0, 1], completedSteps: [0], nextStep: 1, input: { title: "Detailed" },
  });
  assert.deepEqual(activityProgress(plan, { "0": { title: "Simple" }, "1": { body: "Discarded branch" } }, [0]), {
    activeSteps: [0, 2], completedSteps: [0], nextStep: 2, input: { title: "Simple" },
  });
});

test("runtime-created plans cannot add operations, Views, callbacks or skipped requirements", () => {
  const { catalog, plan } = fixture();
  assert.throws(() => catalog.admit({ ...plan, journey: "emit-document" }), /ACTIVITY_OPERATION_NOT_INSTALLED/);
  assert.throws(() => catalog.admit({ ...plan, review: "custom-html" }), /ACTIVITY_VIEW_NOT_INSTALLED/);
  assert.throws(() => catalog.admit({ ...plan, review: Title.id }), /INVALID_ACTIVITY_VIEW_BINDING/);
  assert.throws(() => catalog.admit({ ...plan, approveAs: "administrator" }), /INVALID_ACTIVITY_PLAN/);
  assert.throws(() => catalog.admit({ ...plan, steps: plan.steps.slice(0, 2) }), /INCOMPLETE_ACTIVITY_BRANCH/);
  assert.throws(() => catalog.admit({ ...plan, steps: [{ ...plan.steps[0], inputs: ["owner"] }, ...plan.steps.slice(1)] }),
    /UNKNOWN_ACTIVITY_INPUT/);
  assert.throws(() => catalog.admit({ ...plan, steps: [{ ...plan.steps[0], when: plan.steps[1]!.when }, ...plan.steps.slice(1)] }),
    /ACTIVITY_CONDITION_REQUIRES_EARLIER_INPUT/);
});

test("activity Views cannot smuggle unbound toolbar actions or presentation-only settings", () => {
  const { app } = fixture();
  const withAction = defineView({ name: "action-step", outputs: ports.outputs,
    topDock: Components.Toolbar({ actions: [{ output: ports.output.execute, label: "Do it", icon: "create" }] }),
    content: [Components.Form({ input: ports.inputs.draft })] });
  const settings = defineView({ name: "settings-step", content: [Components.Appearance()] });
  assert.throws(() => activityIndex(app, { journeys: [CreateNote], views: [withAction, Review] }), /UNSUPPORTED_ACTIVITY_VIEW/);
  assert.throws(() => activityIndex(app, { journeys: [CreateNote], views: [settings, Review] }), /UNSUPPORTED_ACTIVITY_VIEW/);
});

test("activities cannot bypass component authoring with raw, copied or serialized Views", () => {
  const { app } = fixture();
  for (const value of [{ ...Title }, JSON.parse(JSON.stringify(Title)), {
    version: Title.version, id: "raw-view", content: [{ kind: "form", id: "raw-component", input: "draft" }],
  }]) assert.throws(() => activityIndex(app, { journeys: [CreateNote], views: [value, Review] }),
    /VIEW_COMPONENT_AUTHORING_REQUIRED/);
});

test("forged object references and copied input tokens fail despite matching identifiers", () => {
  const { catalog, inputs } = fixture();
  assert.throws(() => catalog.define({ journey: { ...CreateNote }, steps: [
    { view: Title, inputs: [inputs.title, inputs.body] },
  ], review: Review }), /UNREGISTERED_ACTIVITY_REFERENCE/);
  assert.throws(() => catalog.define({ journey: CreateNote, steps: [
    { view: Title, inputs: [{ ...inputs.title }, inputs.body] },
  ], review: Review }), /UNREGISTERED_ACTIVITY_INPUT/);
});

test("public module journey references keep typed inputs and installed execution identity", () => {
  const { modules } = catalogFixture();
  const journey = modules.journeys.createNote, inputs = activityInputs(journey);
  const catalog = activityIndex(compile(Notebook), { journeys: [journey], views: [Title, Body, Review] });
  const plan = catalog.define({ journey, steps: [
    { view: Title, inputs: [inputs.title] }, { view: Body, inputs: [inputs.body] },
  ], review: Review });
  assert.equal(plan.journey, CreateNote.id);
  // @ts-expect-error Unknown command inputs are not authored string references.
  void inputs.secret;
});
