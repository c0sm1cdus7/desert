import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, composeProduct, Components, defineView, viewPorts, activityInputs, activityExperience } from "../src/index.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { buildDistribution } from "../src/build/index.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { NoteEditorView } from "./fixtures/authored-view-program.ts";
import { CreateNote, ReadNote } from "./fixtures/notebook-domain.ts";
import { NotebookService, NotebookWeb } from "../products/notebook/distributions.ts";
import { fixtureText } from "./fixtures/messages.ts";

const ports = viewPorts({ inputs: { draft: "form", prepared: "context" }, outputs: [] });
const Form = defineView({ name: "guided-form", content: [Components.Form({ input: ports.inputs.draft })] });
const Review = defineView({ name: "guided-review", content: [Components.Context({ input: ports.inputs.prepared })] });
const inputs = activityInputs(CreateNote);
function source(duplicate: boolean) {
  const base = authoredNotebookSource();
  const activity = { journey: CreateNote, steps: [
    { view: Form, inputs: [inputs.title] }, { view: Form, inputs: [duplicate ? inputs.title : inputs.body] },
  ], review: Review };
  return { ...base, views: [...base.views.filter(view => view !== NoteEditorView), Form, Review],
    journeys: base.journeys.map(registration => "execution" in registration && registration.execution === CreateNote
      ? { execution: CreateNote, label: fixtureText.createNote, humanReview: "required" as const,
        presentation: activityExperience(activity, ReadNote) } : registration),
  };
}

test("invalid activity branches fail composition and cannot be substituted by either build boundary", async () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-activity-build-"));
  try {
    assert.throws(() => composeProduct(source(true)), /DUPLICATE_ACTIVE_ACTIVITY_INPUT/);
    const product = composeProduct(source(false));
    const application = compile(product);
    await assert.doesNotReject(buildHumanModule(application, "human"));
    await assert.rejects(Reflect.apply(buildHumanModule, undefined,
      [application, "human", product.viewProgram]), /VIEW_PROGRAM_OVERRIDE_FORBIDDEN/);
    const output = join(directory, "invalid");
    await assert.rejects(Reflect.apply(buildDistribution, undefined, [application, {
      distributions: [NotebookService, NotebookWeb], target: NotebookWeb.id,
      outputDirectory: output, viewProgram: product.viewProgram,
    }]), /VIEW_PROGRAM_OVERRIDE_FORBIDDEN/);
    assert.equal(existsSync(output), false);
  } finally { rmSync(directory, { recursive: true }); }
});
