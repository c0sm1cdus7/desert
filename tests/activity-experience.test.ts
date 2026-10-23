import assert from "node:assert/strict";
import { test } from "node:test";
import { compile } from "../src/compile.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { viewProgramActivities } from "../src/activities/presentation.ts";
import { surface } from "./fixtures/view-program.ts";
import { ActivityNotebook, guidedProgram } from "./fixtures/activity-experience.ts";

test("an activity cannot silently override a journey that declares immediate submission", () => {
  assert.throws(() => compileViewProgram(guidedProgram, surface), /ACTIVITY_REVIEW_REQUIRED/);
});

test("an activity experience derives the installed allowlist from the same admitted ViewProgram", () => {
  const application = compile(ActivityNotebook), exposed = application.surface("human");
  const admitted = compileViewProgram(guidedProgram, exposed);
  const catalog = viewProgramActivities(application, admitted, "human")!;
  const activity = admitted.journeys.find(journey => journey.kind === "activity")!;
  assert.equal(activity.kind, "activity");
  assert.deepEqual(catalog.admit(activity.activity), activity.activity);
  assert.deepEqual(catalog.views.map(view => view.id), ["note-title", "note-body", "note-review"]);
  assert.throws(() => compileViewProgram({ ...guidedProgram, journeys: guidedProgram.journeys.map(journey => journey.kind !== "activity"
    ? journey : { ...journey, activity: { ...journey.activity, journey: "other-command" } }) }, exposed), /ACTIVITY_JOURNEY_MISMATCH/);
  assert.throws(() => compileViewProgram({ ...guidedProgram, journeys: guidedProgram.journeys.map(journey => journey.kind !== "activity"
    ? journey : { ...journey, activity: { ...journey.activity, steps: [{ view: "note-title", inputs: ["title"] }] } }) }, exposed), /UNUSED_PROGRAM_VIEW|INCOMPLETE_ACTIVITY_BRANCH/);
});
