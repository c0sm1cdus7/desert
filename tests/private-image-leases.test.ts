import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { humanProduct } from "../src/web/client/model.ts";
import { webTransport } from "../src/web/client/transport.ts";
import { privateImageResource } from "../src/svelte/pieces/media/private-image-resource.ts";
import { surface, validate, ready, scope } from "./fixtures/image-input.ts";
import { until } from "./fixtures/client-edit.ts";

const asset = { kind: "asset", reference: "e7000000-0000-4000-8000-000000000001" } as const;

async function fixture(t: TestContext) {
  const control = { connected: true, version: 1, reads: 0, response: undefined as (() => Promise<Response>) | undefined };
  const signals: AbortSignal[] = [], revoked: string[] = [];
  let created = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const operation = url.startsWith("/api/private-images/") ? "image" : url.split("/").at(-1)!;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    if (operation === "availability") {
      if (!control.connected) throw new Error("Disconnected");
      return Response.json(ready);
    }
    if (operation === "begin") return Response.json({ id: body.subject ? "detail-run" : "collection-run" });
    if (operation === "read") {
      control.reads++;
      return Response.json([{ id: "photo", version: control.version,
        facts: body.runId === "detail-run" ? { title: "Photo", image: asset } : { title: "Photo" } }]);
    }
    if (operation === "image") {
      signals.push(init!.signal!);
      // The private optimizer publishes WebP renditions; JPEG is only a possible original.
      return control.response?.() ?? new Response(new Blob(["image"], { type: "image/webp" }));
    }
    throw new Error(`Unexpected ${operation}`);
  });
  const model = humanProduct(surface, validate, { scope,
    transport: webTransport(surface.contractDigest, { kind: "developer" }) });
  await model.start(); await until(() => model.snapshot().loaded); await model.select("photo");
  const resource = privateImageResource(model.images, () => {}, {
    create: () => `blob:private-${++created}`, revoke: value => revoked.push(value),
  });
  t.after(() => { resource.dispose(); model.dispose(); });
  return { model, resource, control, signals, revoked, created: () => created };
}

test("a resolved private image is removed when live controller evidence becomes unavailable", async t => {
  const f = await fixture(t); await f.resource.load(asset, 320);
  assert.equal(f.resource.url, "blob:private-1");
  f.control.connected = false;
  await until(() => !f.model.snapshot().availability.journeys["read-photos"]?.dependenciesReady);
  assert.equal(f.resource.url, undefined);
  assert.deepEqual(f.revoked, ["blob:private-1"]);
});

for (const change of ["close", "back", "stop", "dispose", "leave"] as const) {
  test(`a resolved private image is removed when its owner ${change}s`, async t => {
    const f = await fixture(t); await f.resource.load(asset, 320);
    if (change === "leave") f.model.setReading(false); else f.model[change]();
    assert.equal(f.resource.url, undefined);
    assert.deepEqual(f.revoked, ["blob:private-1"]);
  });
}

test("scope invalidation aborts a private read and a late response never creates pixels", async t => {
  const f = await fixture(t);
  let resolve!: (response: Response) => void;
  f.control.response = () => new Promise(done => { resolve = done; });
  const pending = f.resource.load(asset, 320); await until(() => Boolean(resolve));
  f.model.setReading(false);
  assert.equal(f.signals[0]!.aborted, true);
  resolve(new Response(new Blob(["late image"]))); await pending;
  assert.equal(f.created(), 0); assert.equal(f.resource.url, undefined);
});

test("a new rendition retains pixels only while the same private lease stays valid", async t => {
  const f = await fixture(t); await f.resource.load(asset, 320);
  let resolve!: (response: Response) => void;
  f.control.response = () => new Promise(done => { resolve = done; });
  const larger = f.resource.load(asset, 1920); await until(() => Boolean(resolve));
  assert.equal(f.resource.url, "blob:private-1");
  assert.deepEqual(f.revoked, []);
  f.model.close();
  assert.equal(f.resource.url, undefined); assert.equal(f.signals[1]!.aborted, true);
  resolve(new Response(new Blob(["late larger image"]))); await larger;
  assert.equal(f.created(), 1); assert.deepEqual(f.revoked, ["blob:private-1"]);
});

test("a mounted image reacquires after readiness returns without replaying a write", async t => {
  const f = await fixture(t); await f.resource.load(asset, 320);
  f.control.connected = false;
  await until(() => !f.model.snapshot().availability.journeys["read-photos"]?.dependenciesReady);
  assert.equal(f.resource.url, undefined);
  f.control.connected = true;
  await until(() => Boolean(f.resource.url));
  assert.notEqual(f.resource.url, "blob:private-1");
  assert.equal(f.resource.failed, false);
});

test("unchanged live reads retain pixels; a changed record version revokes the old lease", async t => {
  const f = await fixture(t); await f.resource.load(asset, 320);
  const before = f.control.reads;
  await until(() => f.control.reads >= before + 2);
  assert.equal(f.resource.url, "blob:private-1"); assert.equal(f.revoked.length, 0);
  f.control.version = 2;
  await until(() => f.model.snapshot().detail?.version === 2);
  assert.ok(f.revoked.includes("blob:private-1"));
  await until(() => Boolean(f.resource.url));
  assert.notEqual(f.resource.url, "blob:private-1");
});
