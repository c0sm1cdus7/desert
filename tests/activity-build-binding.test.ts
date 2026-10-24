import { buildFormat, gateVersion } from "../src/build/manifest.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { activityExperience, activityInputs, compile, composeProduct, Components, defineView, viewPorts } from "../src/index.ts";
import { viewProgramActivities } from "../src/activities/presentation.ts";
import { openLocalController } from "../src/local/controller.ts";
import { requireBuildController, requireBuildSession } from "../src/build/session.ts";
import { resolveBuild, webConnection } from "../src/build/plan.ts";
import { installedBuilder } from "../src/build/builders.ts";
import { digest } from "../src/build/files.ts";
import type { BuildManifest } from "../src/build/manifest.ts";
import { NotebookService, NotebookWeb } from "../products/notebook/distributions.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { NoteEditorView } from "./fixtures/authored-view-program.ts";
import { CreateNote, ReadNote } from "./fixtures/notebook-domain.ts";
import { productViewProgram } from "../src/modules/compiled-product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

test("a generated activity catalog must exactly match both controller and session build bindings", async t => {
  const source = authoredNotebookSource(), inputs = activityInputs(CreateNote);
  const ports = viewPorts({ inputs: { writing: "form", review: "context" }, outputs: [] });
  const title = defineView({ name: "guided-title", content: [Components.Form({ input: ports.inputs.writing })] });
  const body = defineView({ name: "guided-body", content: [Components.Form({ input: ports.inputs.writing })] });
  const review = defineView({ name: "guided-review", content: [Components.Context({ input: ports.inputs.review })] });
  const declaration = { ...source,
    views: [...source.views.filter(view => view !== NoteEditorView), title, body, review],
    journeys: [source.journeys[0],
      { ...source.journeys[1], humanReview: "required", presentation: activityExperience({ journey: CreateNote,
        steps: [{ view: title, inputs: [inputs.title] }, { view: body, inputs: [inputs.body] }], review }, ReadNote) },
      source.journeys[2], source.journeys[3], source.journeys[4]],
  } as const;
  const product = composeProduct(declaration);
  const application = compile(product), program = productViewProgram(application);
  const catalog = viewProgramActivities(application, program, "human");
  assert.ok(catalog);
  const distributions = [NotebookService, NotebookWeb];
  const { plan, builder } = installedBuilder(resolveBuild(application, distributions, NotebookWeb.id).plan);
  const manifest: BuildManifest & { activitiesDigest: string } = {
    format: buildFormat, gate: { version: gateVersion }, status: "built", productId: application.id, contractDigest: application.digest,
    distributionId: plan.id, distributionDigest: digest({ target: plan.id, distributions }), distributions,
    surfaceId: plan.surface, surfaceDigest: digest(plan.interaction), viewProgramDigest: digest(program),
    renderer: { id: builder.id, revision: builder.revision() },
    connection: webConnection(plan), files: {}, activitiesDigest: catalog.digest,
  };
  const cluster = postgresCluster(); t.after(() => cluster.dispose());
  const plain = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
  t.after(() => plain.close());
  assert.throws(() => requireBuildController(manifest, plain, "human"), /BUILD_ACTIVITY_CATALOG_MISMATCH/);
  const token = await plain.identities.issue("Build binding witness");
  assert.throws(() => requireBuildSession(manifest, plain.connect(token.token, "human")), /BUILD_ACTIVITY_CATALOG_MISMATCH/);
  const bound = await openLocalController(application, { ...await cluster.database(), roles: ["notes"], activities: catalog });
  t.after(() => bound.close());
  assert.equal(requireBuildController(manifest, bound, "human"), manifest);
  const identity = await bound.identities.issue("Bound witness");
  assert.equal(requireBuildSession(manifest, bound.connect(identity.token, "human")), manifest);
  assert.throws(() => requireBuildController({ ...manifest, activitiesDigest: "0".repeat(64) }, bound, "human"), /BUILD_ACTIVITY_CATALOG_MISMATCH/);
  const { activitiesDigest, ...withoutActivities } = manifest;
  assert.equal(requireBuildController(withoutActivities, plain, "human"), withoutActivities);
  assert.throws(() => requireBuildController(withoutActivities, bound, "human"), /BUILD_ACTIVITY_CATALOG_MISMATCH/);
});
