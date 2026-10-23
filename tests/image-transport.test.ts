import test from "node:test";
import assert from "node:assert/strict";
import { webTransport } from "../src/web/client/transport.ts";

const asset = { kind: "asset", reference: "e7000000-0000-4000-8000-000000000001" } as const;
const input = { runId: "run", inputField: "image", file: new Blob(["bytes"], { type: "image/jpeg" }) };

test("lost image upload response reconciles ready status without replaying upload", async t => {
  const calls: { url: string; init?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, ...(init ? { init } : {}) });
    if (url === "/api/reserveImage") return new Response(JSON.stringify(asset));
    if (url.startsWith("/api/private-images/")) throw new Error("Response lost after server stored bytes");
    if (url === "/api/imageStatus") return new Response(JSON.stringify({ state: "ready", asset }));
    throw new Error("Unexpected request");
  });
  assert.deepEqual(await webTransport("digest", { kind: "developer" }).stageImage(input), asset);
  assert.deepEqual(calls.map(call => call.url.split("?")[0]), ["/api/reserveImage", `/api/private-images/${asset.reference}`, "/api/imageStatus"]);
  assert.equal(calls[1]!.init!.body, input.file);
  assert.equal(calls[1]!.init!.credentials, "same-origin");
  assert.equal(calls[1]!.init!.cache, "no-store");
  assert.deepEqual(calls[1]!.init!.headers, { "Content-Type": "application/octet-stream", "X-Desert-Contract": "digest" });
});

for (const state of ["reserved", "uploading", "failed"]) test(`lost upload response with ${state} status does not replay or invent a completed asset`, async t => {
  let uploads = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url === "/api/reserveImage") return new Response(JSON.stringify(asset));
    if (url.startsWith("/api/private-images/")) { uploads++; throw new Error("Response lost"); }
    return new Response(JSON.stringify({ state }));
  });
  await assert.rejects(webTransport("digest", { kind: "developer" }).stageImage(input), /IMAGE_UPLOAD_NOT_READY/);
  assert.equal(uploads, 1);
});

test("upload cannot swap the reserved asset reference or accept extra wire fields", async t => {
  let extra = false;
  t.mock.method(globalThis, "fetch", async (url: string) => new Response(JSON.stringify(url === "/api/reserveImage" ? asset : extra
    ? { ...asset, path: "private/path" } : { ...asset, reference: "e7000000-0000-4000-8000-000000000002" })));
  await assert.rejects(webTransport("digest", { kind: "developer" }).stageImage(input), /INVALID_RESPONSE/);
  extra = true;
  await assert.rejects(webTransport("digest", { kind: "developer" }).stageImage(input), /INVALID_RESPONSE/);
});

test("aborting upload does not reconcile or replay canceled work", async t => {
  const abort = new AbortController();
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requests++;
    if (url === "/api/reserveImage") return new Response(JSON.stringify(asset));
    abort.abort(); throw new Error("Request aborted");
  });
  await assert.rejects(webTransport("digest", { kind: "developer" }).stageImage(input, { signal: abort.signal }), /Request aborted/);
  assert.equal(requests, 2);
});

test("private image fetch preserves controller scope and rejects non-image responses", async t => {
  let responseType = "image/webp", request: { url: string; init?: RequestInit } | undefined;
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    request = { url, ...(init ? { init } : {}) };
    return new Response(new Blob(["fixture"], { type: responseType }));
  });
  const read = { runId: "subject-run", reference: asset.reference, variant: 320 as const };
  assert.equal((await webTransport("digest", { kind: "developer" }).image(read)).type, "image/webp");
  assert.equal(request!.url, `/api/private-images/${asset.reference}?runId=subject-run&variant=320`);
  assert.equal(request!.init!.credentials, "same-origin");
  assert.equal(request!.init!.cache, "no-store");
  responseType = "text/html";
  await assert.rejects(webTransport("digest", { kind: "developer" }).image(read), /INVALID_RESPONSE/);
});

test("private playable originals retain verified media kind without widening rendition MIME", async t => {
  let responseType="video/mp4";
  t.mock.method(globalThis,"fetch",async(url:string)=>{
    if(url==="/api/reserveImage")return Response.json(asset);
    if(url.includes("inputField=media"))return Response.json({...asset,media:"video"});
    return new Response(new Blob(["fixture"],{type:responseType}));
  });
  const transport=webTransport("digest",{kind:"developer"});
  assert.deepEqual(await transport.stageImage({...input,inputField:"media",file:new Blob(["bytes"],{type:"video/mp4"})}),{...asset,media:"video"});
  const original={runId:"subject-run",reference:asset.reference,variant:"original" as const};
  for(const type of ["video/mp4","audio/mp4","audio/mpeg","audio/wav"]){responseType=type;assert.equal((await transport.image(original)).type,type);}
  await assert.rejects(transport.image({...original,variant:320}),/INVALID_RESPONSE/);
  responseType="text/html";await assert.rejects(transport.image(original),/INVALID_RESPONSE/);
  responseType="image/svg+xml";await assert.rejects(transport.image(original),/INVALID_RESPONSE/);
});

test('temporary private transfer contention retries the same authorized read, not forbidden responses', async t => {
  let calls = 0, code = 'ASSET_TRANSFER_BUSY';
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    if (calls === 1 || code !== 'ASSET_TRANSFER_BUSY') return Response.json({ error: code }, { status: 409 });
    return new Response(new Blob(['image'], { type: 'image/webp' }));
  });
  const transport = webTransport('digest', { kind: 'developer' });
  const read = { runId: 'authorized', reference: asset.reference, variant: 160 as const };
  assert.equal((await transport.image(read)).type, 'image/webp'); assert.equal(calls, 2);
  code = 'ASSET_NOT_AUTHORIZED'; calls = 0;
  await assert.rejects(transport.image(read), /ASSET_NOT_AUTHORIZED/); assert.equal(calls, 1);
});

test('queued private reads recheck session ownership before requesting bytes', async t => {
  let current = true, calls = 0;
  const releases: (() => void)[] = [];
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    await new Promise<void>(resolve => releases.push(resolve));
    return new Response(new Blob(['image'], { type: 'image/webp' }), { headers: { 'X-Desert-Session': 'session' } });
  });
  const transport = webTransport('digest', { kind: 'identity', sessionBinding: 'session', isCurrent: () => current, invalidate() { current = false; } });
  const read = { runId: 'authorized', reference: asset.reference, variant: 160 as const };
  const first = transport.image(read), second = transport.image(read), queued = transport.image(read);
  const outcomes = Promise.allSettled([first, second, queued]);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 2);
  current = false; releases.forEach(resolve => resolve());
  for (const outcome of await outcomes) {
    assert.equal(outcome.status, 'rejected');
    if (outcome.status === 'rejected') assert.match(String(outcome.reason), /BROWSER_SESSION_CHANGED/);
  }
  assert.equal(calls, 2, 'revoked queued operation never reaches fetch');
});

test('cancelling a busy retry prevents another private request', async t => {
  let calls = 0; const abort = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => { calls++; queueMicrotask(() => abort.abort()); return Response.json({ error: 'ASSET_TRANSFER_BUSY' }, { status: 409 }); });
  await assert.rejects(webTransport('digest', { kind: 'developer' }).image({ runId: 'authorized', reference: asset.reference, variant: 160 }, { signal: abort.signal }));
  assert.equal(calls, 1);
});
