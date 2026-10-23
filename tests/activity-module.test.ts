import assert from "node:assert/strict";
import { test } from "node:test";
import { activityExperience, activityInputs, Components, defineView, viewPorts, defineModule } from "../src/index.ts";
import { requireModuleHandle } from "../src/modules/references.ts";
import { notesSource } from "./fixtures/module-catalog.ts";

function definition() {
  const source = notesSource(), create = source.journeys[0].execution, read = source.journeys[1].execution;
  const inputs = activityInputs(create), ports = viewPorts({ inputs: { writing: "form", review: "context" }, outputs: [] });
  const title = defineView({ name: "guided-title", content: [Components.Form({ input: ports.inputs.writing })] });
  const body = defineView({ name: "guided-body", content: [Components.Form({ input: ports.inputs.writing })] });
  const review = defineView({ name: "guided-review", content: [Components.Context({ input: ports.inputs.review })] });
  const activity = { journey: create, steps: [{ view: title, inputs: [inputs.title] }, { view: body, inputs: [inputs.body] }], review };
  const owned = { ...source, views: [source.views[0], source.views[1], title, body, review],
    journeys: [{ ...source.journeys[0], presentation: activityExperience(activity, read), humanReview: "required" as const },
      source.journeys[1], source.journeys[2]] } as const;
  return { owned, activity, inputs, read };
}

test("module activity authoring lowers registered Views, command inputs and execution references once", () => {
  const { owned } = definition();
  const registered = requireModuleHandle(defineModule(owned)).definition;
  const experience = registered.journeys?.[0]?.presentation;
  assert.equal(experience?.kind, "activity");
  if (experience?.kind !== "activity") throw new Error("Expected an activity experience");
  assert.deepEqual(experience.activity, { version: "desert.activity/1", journey: "create-note", review: "guided-review",
    steps: [{ view: "guided-title", inputs: ["title"] }, { view: "guided-body", inputs: ["body"] }] });
});

test("module activity authoring rejects copied input tokens before canonical lowering", () => {
  const { owned, activity, inputs, read } = definition();
  const invalid = { ...activity, steps: [{ ...activity.steps[0]!, inputs: [{ ...inputs.title }] }, activity.steps[1]!] };
  assert.throws(() => defineModule({ ...owned, journeys: [
    { ...owned.journeys[0], presentation: activityExperience(invalid, read) }, owned.journeys[1], owned.journeys[2],
  ] }), /UNREGISTERED_ACTIVITY_INPUT/);
});
