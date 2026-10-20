import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { servePublicCatalog } from "../src/build/public-catalog/serve.ts";
import { loadPublicCatalogBuild } from "../src/build/public-catalog/manifest.ts";
import { publicCatalogHostFixture } from "./fixtures/public-catalog-host.ts";

test("public catalog host permits GET/HEAD on exact public paths, never controller or write routes", async t => {
  const fixture = publicCatalogHostFixture();
  t.after(() => fixture.close());
  const server = await servePublicCatalog(fixture.options);
  t.after(() => server.close());
  for (const path of ["/", "/_app/app.js", "/media/parks.lake"]) {
    const response = await fetch(server.origin + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
    const head = await fetch(server.origin + path, { method: "HEAD" });
    assert.equal(head.status, 200, path);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  }
  for (const path of ["/api", "/api/commands", "/controller", "/__desert/session", "/surface.json", "/package.json",
    "/PUBLIC-CATALOG-BUILD.json", "/web/handler.js", "/media/missing", "/media/%2Fparks.lake", "/media/../surface.json"]) {
    assert.equal((await fetch(server.origin + path)).status, 404, path);
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    for (const path of ["/", "/media/parks.lake", "/api/commands"]) {
      const response = await fetch(server.origin + path, { method });
      assert.equal(response.status, 405, `${method} ${path}`);
      assert.equal(response.headers.get("allow"), "GET, HEAD");
    }
  }
  assert.equal((await fetch(server.origin + "/media/%")).status, 400);
  const image = await fetch(server.origin + "/media/parks.lake");
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert.equal(image.headers.get("x-content-type-options"), "nosniff");
  assert.equal(image.headers.get("content-length"), String(fixture.bytes.length));
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), fixture.bytes);
  const optimized = await fetch(server.origin + '/media/parks.lake?w=160');
  assert.equal(optimized.status, 200); assert.equal(optimized.headers.get('content-type'), 'image/webp');
  const etag = optimized.headers.get('etag')!;
  assert.equal((await fetch(server.origin + '/media/parks.lake?w=160', {headers:{'if-none-match':etag}})).status, 304);
  assert.equal((await fetch(server.origin + '/media/parks.lake?w=999999')).status, 400);
});

test("host snapshots isolate running media and renderer from later source edits", async t => {
  const fixture = publicCatalogHostFixture();
  t.after(() => fixture.close());
  const server = await servePublicCatalog(fixture.options);
  t.after(() => server.close());
  writeFileSync(join(fixture.sourceRoot, "media/lake.jpg"), "changed source");
  writeFileSync(join(fixture.buildDirectory, "web/handler.js"), "throw new Error('must not load');");
  assert.deepEqual(Buffer.from(await (await fetch(server.origin + "/media/parks.lake")).arrayBuffer()), fixture.bytes);
  assert.equal(await (await fetch(server.origin)).text(), "renderer:/");
});

test("tampered build or external media fails before starting a server", async () => {
  for (const target of ["build", "media", "symlink", "build-symlink"] as const) {
    const fixture = publicCatalogHostFixture();
    try {
      if (target === "build") writeFileSync(join(fixture.buildDirectory, "web/handler.js"), "throw new Error('untrusted');");
      if (target === "media") writeFileSync(join(fixture.sourceRoot, "media/lake.jpg"), "changed");
      if (target === "symlink") {
        unlinkSync(join(fixture.sourceRoot, "media/lake.jpg"));
        symlinkSync(join(fixture.sourceRoot, "media/hill.jpg"), join(fixture.sourceRoot, "media/lake.jpg"));
      }
      if (target === "build-symlink") symlinkSync(join(fixture.sourceRoot, "media/lake.jpg"), join(fixture.buildDirectory, "unexpected.jpg"));
      await assert.rejects(servePublicCatalog(fixture.options), target === "build" ? /BUILD_FILES_MISMATCH/ : /CATALOG_MEDIA_MISMATCH|SYMLINK/);
    } finally { fixture.close(); }
  }
});

test("manifest metadata must agree with its verified public surface and media references", () => {
  const fixture = publicCatalogHostFixture();
  try {
    for (const change of [
      { productId: "unrelated-product" }, { contractDigest: "0".repeat(64) },
      { assets: [] }, { assets: fixture.manifest.assets.slice(1) }, { assets: [...fixture.manifest.assets, fixture.manifest.assets[0]] },
      { assets: fixture.manifest.assets.map(asset => ({ ...asset, mediaType: "text/html" })) },
    ]) {
      fixture.writeManifest({ ...fixture.manifest, ...change });
      assert.throws(() => loadPublicCatalogBuild(fixture.buildDirectory), /INVALID_PUBLIC_CATALOG_BUILD|BUILD_SURFACE_MISMATCH|CATALOG_MEDIA_REFERENCE/);
    }
  } finally { fixture.close(); }
});
