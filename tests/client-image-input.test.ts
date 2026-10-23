import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { humanProduct } from "../src/web/client/model.ts";
import { webTransport } from "../src/web/client/transport.ts";
import { imageInputControl } from "../src/interaction/image-input.ts";
import { LocalFileHost } from "../src/svelte/controls/file-host.ts";
import { presentFrame } from "../src/web/client/frame.ts";
import { surface, mutation, validate, ready, scope } from "./fixtures/image-input.ts";
import { until } from "./fixtures/client-edit.ts";

// Client transport fixtures only. Real staged bytes and authority are covered by private-images-runtime.test.ts.
const asset = { kind: "asset", reference: "e7000000-0000-4000-8000-000000000001" } as const;
async function fixture(t: TestContext) {
  const files = new LocalFileHost(), calls: { operation: string; body: unknown; init?: RequestInit }[] = [];
  const control = { saved: false, uploadError: false, connected: true,
    beforePrepare: undefined as (() => Promise<void>) | undefined, image: undefined as (() => Promise<Response>) | undefined };
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const operation = url.startsWith("/api/private-images/") ? (init?.method === "POST" ? "upload" : "image") : url.split("/").at(-1)!;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    calls.push({ operation, body, ...(init ? { init } : {}) });
    let result: unknown;
    if (operation === "availability") {
      if (!control.connected) throw new Error("Disconnected"); result = ready;
    } else if (operation === "begin") result = { id: body.subject ? "detail-run" : "run" };
    else if (operation === "read") result = control.saved ? [{ id: "photo", version: 1,
      facts: body.runId === "detail-run" ? { title: "Photo", image: asset } : { title: "Photo" } }] : [];
    else if (operation === "reserveImage") result = asset;
    else if (operation === "upload") {
      if (control.uploadError) return new Response(JSON.stringify({ error: "INVALID_IMAGE" }), { status: 422 }); result = asset;
    } else if (operation === "prepare") {
      await control.beforePrepare?.(); result = { id: "intent", runId: "run", journeyId: mutation.id,
        object: { id: "photo", type: "photo", expectedVersion: 0 }, confirmationDigest: "confirmation", facts: body.input };
    } else if (operation === "accept") {
      control.saved = true; result = { id: "intent", runId: "run", commandId: mutation.commandId, status: "completed",
        object: { id: "photo", type: "photo", version: 1 } };
    } else if (operation === "image") return control.image?.() ?? new Response(new Blob(["decoded fixture"], { type: "image/webp" }));
    else throw new Error(`Unexpected ${operation}`);
    return new Response(JSON.stringify(result));
  });
  const model = humanProduct(surface, validate, { files, scope,
    transport: webTransport(surface.contractDigest, { kind: "developer" }) });
  t.after(() => { model.dispose(); files.dispose(); });
  await model.start(); await until(() => model.snapshot().loaded);
  model.create(); model.edit("title", "Photo");
  const file = new File(["fake jpeg data"], "photo.jpg", { type: "image/jpeg", lastModified: 1 });
  const choice = files.choose(imageInputControl("image", "Image", []), [file]);
  model.editFiles(choice.event);
  const selected = choice.event.files[0]!;
  return { model, files, file, selected, calls, control };
}

test("file choice remains local; submit stages exact bytes before canonical prepare and releases handles after receipt", async t => {
  const f = await fixture(t);
  assert.equal(f.calls.some(call => ["reserveImage", "upload", "prepare"].includes(call.operation)), false);
  const frame = presentFrame(surface, f.model.snapshot(), validate, scope);
  assert.equal(frame.content.kind, "form");
  assert.equal(frame.bottom.primary?.state, "ready");
  await f.model.invoke(mutation);
  assert.deepEqual(f.calls.filter(call => ["reserveImage", "upload", "prepare", "accept"].includes(call.operation)).map(call => call.operation),
    ["reserveImage", "upload", "prepare", "accept"]);
  assert.equal(f.calls.find(call => call.operation === "upload")?.body, f.file);
  assert.deepEqual(f.calls.find(call => call.operation === "prepare")?.body, { runId: "run", input: { title: "Photo", image: asset } });
  assert.equal(f.model.snapshot().view, "detail");
  assert.equal(f.files.resolve(f.selected.id), undefined);
  assert.deepEqual(f.model.snapshot().detail?.facts.image, asset);
});

test("failed upload keeps the local draft and never prepares, accepts, or retries bytes", async t => {
  const f = await fixture(t); f.control.uploadError = true;
  await f.model.invoke(mutation);
  assert.equal(f.model.snapshot().error, "INVALID_IMAGE");
  assert.equal(f.model.snapshot().view, "create");
  assert.equal(f.files.resolve(f.selected.id), f.file);
  assert.equal(f.calls.filter(call => call.operation === "upload").length, 1);
  assert.equal(f.calls.some(call => ["prepare", "accept"].includes(call.operation)), false);
});

test("a canceled model cannot accept a prepare result arriving after disposal", async t => {
  const f = await fixture(t);
  let resume!: () => void;
  f.control.beforePrepare = () => new Promise<void>(resolve => { resume = resolve; });
  const pending = f.model.invoke(mutation);
  await until(() => Boolean(resume));
  f.model.dispose(); resume(); await pending;
  assert.equal(f.calls.some(call => call.operation === "accept"), false);
  assert.equal(f.files.resolve(f.selected.id), undefined);
});

test("removing a file releases its browser handle and invalidates the required image input", async t => {
  const f = await fixture(t);
  f.model.editFiles({ kind: "files.remove", control: "image", file: f.selected.id });
  assert.equal(f.files.resolve(f.selected.id), undefined);
  assert.equal(presentFrame(surface, f.model.snapshot(), validate, scope).bottom.primary?.state, "unavailable");
  await f.model.invoke(mutation);
  assert.equal(f.calls.some(call => call.operation === "prepare"), false);
});

test("private image reads use only the active published subject and expire when its read scope closes", async t => {
  const f = await fixture(t);
  await assert.rejects(f.model.image(asset, 320), /IMAGE_READ_UNAVAILABLE/);
  await f.model.invoke(mutation);
  await assert.rejects(f.model.image({ ...asset, reference: "e7000000-0000-4000-8000-000000000002" }, 320), /IMAGE_READ_UNAVAILABLE/);
  const blob = await f.model.image(asset, 320);
  assert.equal(blob.type, "image/webp");
  assert.ok(f.calls.some(call => call.operation === "begin" && (call.body as { subject?: string }).subject === "photo"));
  let resume!: () => void;
  f.control.image = () => new Promise<Response>(resolve => { resume = () => resolve(new Response(new Blob(["late"], { type: "image/webp" }))); });
  const pending = f.model.image(asset, 320); await until(() => Boolean(resume));
  f.model.setReading(false); resume();
  await assert.rejects(pending, /IMAGE_READ_EXPIRED/);
  await assert.rejects(f.model.image(asset, 320), /IMAGE_READ_UNAVAILABLE/);
});

for (const action of ["close", "back"] as const) test(`closing a private detail with ${action} expires outstanding reads and rejects residual retained facts`, async t => {
  const f = await fixture(t); await f.model.invoke(mutation);
  let resume!: () => void;
  f.control.image = () => new Promise<Response>(resolve => { resume = () => resolve(new Response(new Blob(["late"], { type: "image/webp" }))); });
  const pending = f.model.image(asset, 320); await until(() => Boolean(resume));
  f.model[action](); resume();
  await assert.rejects(pending, /IMAGE_READ_EXPIRED/);
  await assert.rejects(f.model.image(asset, 320), /IMAGE_READ_UNAVAILABLE/);
});
