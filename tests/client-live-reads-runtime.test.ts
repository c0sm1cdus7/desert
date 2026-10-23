import assert from "node:assert/strict";
import test from "node:test";
import { openLocalController } from "../src/local/controller.ts";
import { localViewProgram } from "../src/local/view-program.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { multiApplication, multiProgram, multiSurface } from "./fixtures/multi-view-program.ts";
import { until } from "./fixtures/multi-view-runtime.ts";
import { captureViewEvents } from "./fixtures/owned-view-events.ts";

test("live reads renew expired admissions, observe another surface and preserve published projection", async t => {
  const cluster = postgresCluster(); t.after(() => cluster.dispose());
  const host = await openLocalController(multiApplication, { ...await cluster.database(), roles: ["notes"], runLifetimeMs: 350 });
  t.after(() => host.close());
  const identity = await host.identities.issue("Live reader");
  const human = host.connect(identity.token, "human"), agent = host.connect(identity.token, "agent");
  const created = await agent.prepare((await agent.begin("create-note")).id, { title: "Original", body: "Original body" });
  const receipt = await agent.accept(created.id, created.confirmationDigest);
  const model = localViewProgram(human, multiProgram, multiSurface); t.after(() => model.stop());
  await model.start(); model.navigate("notes");
  await until(() => model.snapshot().state.loaded);
  captureViewEvents(model)({ kind: "surface.invoke", intent: {
    kind: "view.output", view: "notes", output: "select", recordId: receipt.object.id,
  } });
  await until(() => model.snapshot().state.detail?.version === 1);
  const change = await agent.prepare((await agent.begin("edit-note", receipt.object.id)).id,
    { title: "Another surface", body: "Updated body" }, { expectedVersion: 1 });
  await agent.accept(change.id, change.confirmationDigest);
  await until(() => model.snapshot().state.detail?.version === 2);
  assert.equal(model.snapshot().state.detail?.facts.title, "Another surface");
  assert.equal(model.snapshot().state.offers["edit-note"]?.version, 2);
  assert.equal(model.snapshot().state.detail?.facts.owner, undefined);
  assert.equal(model.snapshot().state.error, null);
});
