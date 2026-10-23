import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { localWebGateway } from "../src/web/gateway.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { application, privateImagesFixture, ImportPhoto, ReadPhotos } from "./fixtures/private-images.ts";
import type { ApiMethods } from "../src/web/types.ts";

test("private HTTP uploads and reads require the browser session, exact contract, origin and canonical read scope", async () => {
  const cluster = postgresCluster(), f = await privateImagesFixture(cluster);
  const gateway = localWebGateway(f.session, application.digest);
  let origin = "", cookie = "";
  const server = createServer((request, response) => { void gateway.handle(request, response, origin); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TEST_HOST_FAILED");
  origin = `http://127.0.0.1:${address.port}`;
  function json(method: string, input: unknown) {
    return fetch(`${origin}/api/${method}`, { method: "POST", headers: {
      "Content-Type": "application/json", "X-Desert-Contract": application.digest, Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    }, body: JSON.stringify(input) });
  }
  async function call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"]): Promise<ApiMethods[K]["output"]> {
    const response = await json(method, input), result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result)); return result;
  }
  try {
    const connected = await json("connect", { invitation: gateway.invitation });
    cookie = connected.headers.get("set-cookie")!.split(";")[0]!;
    const run = await call("begin", { journeyId: ImportPhoto.id });
    const asset = await call("reserveImage", { runId: run.id, inputField: "image", size: f.bytes.length });
    const upload = `${origin}/api/private-images/${asset.reference}?runId=${run.id}&inputField=image`;
    const headers = { "Content-Type": "application/octet-stream", "X-Desert-Contract": application.digest, Cookie: cookie, Origin: origin };
    assert.equal((await fetch(upload, { method: "POST", headers: { ...headers, Origin: "https://other.invalid" }, body: f.bytes })).status, 403);
    const missingCookie = { ...headers }; delete (missingCookie as Partial<typeof headers>).Cookie;
    assert.equal((await fetch(upload, { method: "POST", headers: missingCookie, body: f.bytes })).status, 401);
    const uploaded = await fetch(upload, { method: "POST", headers, body: f.bytes });
    assert.equal(uploaded.status, 200, await uploaded.clone().text()); assert.deepEqual(await uploaded.json(), asset);
    const intent = await call("prepare", { runId: run.id, input: { title: "HTTP private image", image: asset } });
    const receipt = await call("accept", { intentId: intent.id, confirmationDigest: intent.confirmationDigest });
    const read = await call("begin", { journeyId: ReadPhotos.id, subject: receipt.object.id });
    const image = `${origin}/api/private-images/${asset.reference}?runId=${read.id}&variant=160`;
    const readHeaders = { Cookie: cookie, "X-Desert-Contract": application.digest };
    assert.equal((await fetch(image)).status, 401);
    assert.equal((await fetch(image, { headers: { Cookie: cookie } })).status, 409);
    assert.equal((await fetch(image, { headers: { ...readHeaders, "Sec-Fetch-Site": "cross-site" } })).status, 403);
    const response = await fetch(image, { headers: readHeaders });
    assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/webp");
    assert.equal(response.headers.get("cache-control"), "no-store"); assert.ok((await response.arrayBuffer()).byteLength);
    const listing = await call("begin", { journeyId: ReadPhotos.id });
    assert.equal((await fetch(image.replace(read.id, listing.id), { headers: readHeaders })).status, 409);
    await f.host.identities.revoke(f.owner.id);
    const revoked = await fetch(image, { headers: readHeaders });
    assert.equal(revoked.status, 401); assert.equal((await revoked.json()).error, "UNAUTHENTICATED");
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    gateway.close(); await f.host.close(); cluster.dispose();
  }
});
