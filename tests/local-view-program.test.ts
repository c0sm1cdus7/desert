import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { compile } from "../src/compile.ts";
import { openLocalController, type LocalSession } from "../src/local.ts";
import { localViewProgram } from "../src/local/view-program.ts";
import { MultiNotebook, multiProgram } from "./fixtures/multi-view-program.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { until } from "./fixtures/multi-view-runtime.ts";
import { captureViewEvents } from "./fixtures/owned-view-events.ts";
import { pollTimers } from "./fixtures/poll-timers.ts";

const application = compile({ ...MultiNotebook, surfaces: MultiNotebook.surfaces.map(surface => surface.kind !== "human"
  ? surface : { ...surface, commit: { ...surface.commit, "create-note": "review", "edit-note": "review" } }) });
const expected = { id: "human", contractDigest: application.digest };
let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

test("local navigation requires an SDK-issued session and exact exposure/contract binding", async t => {
  assert.throws(() => localViewProgram({} as LocalSession, multiProgram, expected), /UNTRUSTED_LOCAL_SESSION/);
  const host = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
  t.after(() => host.close());
  const identity = await host.identities.issue("Isolated local navigation test");
  const session = host.connect(identity.token, "human");
  assert.throws(() => localViewProgram({ ...session }, multiProgram, expected), /UNTRUSTED_LOCAL_SESSION/);
  assert.throws(() => localViewProgram(session, multiProgram, { ...expected, id: "agent" }), /VIEW_SESSION_SURFACE_MISMATCH/);
  assert.throws(() => localViewProgram(session, multiProgram, { ...expected, contractDigest: "foreign" }), /VIEW_SESSION_CONTRACT_MISMATCH/);
  assert.throws(() => localViewProgram(host.connect(identity.token, "agent"), multiProgram,
    { ...expected, id: "agent" }), /INVALID_VIEW_PROGRAM_SURFACE/);
  assert.throws(() => localViewProgram(session, { ...multiProgram, productId: "foreign" }, expected), /VIEW_PROGRAM_PRODUCT_MISMATCH/);
});

test("local headless navigation uses canonical review, subject authority and instance ownership without browser requests", async t => {
  const host = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
  t.after(() => host.close());
  const identity = await host.identities.issue("Headless owner"), session = host.connect(identity.token, "human");
  let browserCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { browserCalls++; throw new Error("No browser transport here"); });
  const model = localViewProgram(session, multiProgram, expected);
  t.after(() => model.stop());
  await model.start();
  await until(() => model.snapshot().state.availability.journeys["create-note"]?.dependenciesReady === true);
  const emit = () => captureViewEvents(model);
  const output = (view: string, output: string, recordId?: string) => emit()({ kind: "surface.invoke",
    intent: { kind: "view.output", view, output, ...(recordId ? { recordId } : {}) } });
  output("home", "notes");
  await until(() => model.snapshot().state.loaded);
  output("notes", "create");
  emit()({ kind: "input.change", name: "title", value: "Headless note" });
  emit()({ kind: "input.change", name: "body", value: "The same interpreter" });
  const oldEditor = emit();
  output("editor", "save");
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  assert.deepEqual(await session.read((await session.begin("read-note")).id), [], "review never silently accepts");
  const intentId = model.snapshot().state.prepared!.id;
  oldEditor({ kind: "surface.invoke", intent: { kind: "accept" } });
  assert.equal(await session.receipt(intentId), null, "old editor cannot act for the review instance");
  emit()({ kind: "surface.invoke", intent: { kind: "accept" } });
  await until(() => model.snapshot().state.view === "detail" && Boolean(model.snapshot().state.detail) && !model.snapshot().state.busy);
  assert.equal(model.snapshot().panel?.frame.top.title, "Headless note");
  emit()({ kind: "surface.invoke", intent: { kind: "journey", journey: "edit-note" } });
  assert.equal(model.snapshot().state.view, "edit");
  const base = model.snapshot().state.editing!.expectedVersion;
  emit()({ kind: "input.change", name: "body", value: "Edited without a renderer" });
  output("edit-note", "save");
  await until(() => model.snapshot().state.view === "review" && !model.snapshot().state.busy);
  assert.equal(model.snapshot().state.prepared?.object.expectedVersion, base);
  emit()({ kind: "surface.invoke", intent: { kind: "accept" } });
  await until(() => model.snapshot().state.detail?.version === base + 1 && !model.snapshot().state.busy);
  assert.equal(model.snapshot().state.detail?.facts.body, "Edited without a renderer");
  const stranger = await host.identities.issue("Other isolated identity");
  assert.deepEqual(await host.connect(stranger.token, "human").read((await host.connect(stranger.token, "human").begin("read-note")).id), []);
  emit()({ kind: "surface.invoke", intent: { kind: "journey", journey: "edit-note" } });
  emit()({ kind: "input.change", name: "body", value: "Unsent old-base draft" });
  const detail = model.snapshot().state.detail!;
  const concurrent = await session.prepare((await session.begin("edit-note", detail.id)).id,
    { title: "External edit", body: "Newer base" }, { expectedVersion: detail.version });
  await session.accept(concurrent.id, concurrent.confirmationDigest);
  output("edit-note", "save");
  await until(() => model.snapshot().error === "VERSION_CONFLICT" && !model.snapshot().state.busy);
  assert.equal(model.snapshot().state.editing?.expectedVersion, detail.version);
  assert.equal(model.snapshot().state.draft.body, "Unsent old-base draft");
  await host.identities.revoke(identity.id);
  await until(() => model.snapshot().state.availability.journeys["edit-note"]?.blockers.some(blocker => blocker.reason === "session-required") === true);
  assert.equal(model.snapshot().state.draft.body, "Unsent old-base draft");
  assert.equal(browserCalls, 0);
  const lastOwner = emit(); model.stop();
  const disposed = model.snapshot().state;
  assert.deepEqual(disposed.draft, { title: "", body: "" }, "terminal disposal clears private writing");
  assert.equal(disposed.detail, null, "terminal disposal clears private object data");
  lastOwner({ kind: "surface.invoke", intent: { kind: "journey", journey: "edit-note" } });
  assert.deepEqual(model.snapshot().state, disposed, "an old owner cannot revive disposed state");
});

test("local repeated start and terminal stop retain no observers and do not close the borrowed session", async t => {
  const host = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
  t.after(() => host.close());
  const identity = await host.identities.issue("Local lifecycle"), session = host.connect(identity.token, "human");
  const timers = pollTimers(t), model = localViewProgram(session, multiProgram, expected);
  t.after(() => model.stop());
  await Promise.all([model.start(), model.start()]);
  await until(() => model.snapshot().state.availability.journeys["read-note"]?.dependenciesReady === true);
  model.stop();
  assert.equal(timers.size, 0, "both the shared observers and the local watcher must stop");
  await model.start();
  assert.equal(timers.size, 0, "stop cannot be undone by start");
  assert.deepEqual(await session.read((await session.begin("read-note")).id), [], "the host does not own the session");
});
