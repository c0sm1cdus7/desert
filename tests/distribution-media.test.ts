import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { compile, composeProduct, Components, defineView } from "../src/index.ts";
import { buildDistribution, loadVerifiedBuild } from "../src/build/index.ts";
import { serveBuiltLocalSurface } from "../src/build/serve.ts";
import { openLocalController } from "../src/local.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { NotebookService, NotebookWeb } from "../products/notebook/distributions.ts";
const MediaView = defineView({ name: "media", content: [
    Components.Header({ title: "Media", subtitle: "Reference images." }),
    Components.MediaLibrary({ library: { id: "test-images",
      items: [{ id: "image", kind: "image", title: "Image", image: { asset: "sample-photo", alt: "A test image" } }],
      albums: [{ id: "album", title: "Album", cover: "image", items: ["image"] }], featured: ["album"] } }),
  ] });
const BrowseMedia = { id: "browse-media", kind: "presentation", view: MediaView, outputs: [] } as const;
const MediaDestination = { id: "media", label: "Media", icon: "open", entryJourney: BrowseMedia } as const;
const source = authoredNotebookSource();
const MediaProduct = composeProduct({ ...source,
  views: [...source.views, MediaView], journeys: [...source.journeys, { presentation: BrowseMedia }],
  destinations: [...source.destinations, MediaDestination],
  navigation: [...source.navigation, { destination: MediaDestination, group: "Explore", purpose: "content" }] as const,
});

test("human distribution binds external images without shipping files and serves verified renditions", { timeout: 120000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-distribution-media-"));
  const output = join(directory, "build");
  const original = await sharp({ create: { width: 320, height: 160, channels: 3, background: "#526789" } }).png().toBuffer();
  writeFileSync(join(directory, "private-source.png"), original);
  const media = { sourceRoot: directory, assets: [{ id: "sample-photo", path: "private-source.png", alt: "A test image" }] };
  const options = { distributions: [NotebookService, NotebookWeb], target: NotebookWeb.id, outputDirectory: output, media };
  const application = compile(MediaProduct);
  let cluster: ReturnType<typeof postgresCluster> | undefined;
  let controller: Awaited<ReturnType<typeof openLocalController>> | undefined;
  let server: Awaited<ReturnType<typeof serveBuiltLocalSurface>> | undefined;
  try {
    const { media: _media, ...withoutMedia } = options;
    await assert.rejects(buildDistribution(application, withoutMedia), /VIEW_MEDIA_BINDING_REQUIRED/);
    await assert.rejects(buildDistribution(application, { ...options,
      media: { ...media, assets: [...media.assets, { id: "unused-photo", path: "private-source.png", alt: "Unused" }] },
    }), /UNREFERENCED_LOCAL_MEDIA_BINDING/);
    const build = await buildDistribution(application, options);
    assert.ok(Object.hasOwn(build.files, "LOCAL-MEDIA.json"), "the verified build attests its external media");
    const attestation = readFileSync(join(output, "LOCAL-MEDIA.json"), "utf8");
    assert.ok(!attestation.includes(directory) && !attestation.includes("private-source.png"), "host paths never enter the build");
    assert.ok(!Object.keys(build.files).some(path => path.endsWith("private-source.png")), "the original remains external");
    assert.deepEqual(loadVerifiedBuild(output), build);
    cluster = postgresCluster();
    controller = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
    const identity = await controller.identities.issue("Media build test");
    const session = controller.connect(identity.token, "human");
    await assert.rejects(serveBuiltLocalSurface({ buildDirectory: output, session, port: 0 }), /LOCAL_MEDIA_BINDING_REQUIRED/);
    const empty = { buildDirectory: output, session, port: 0, media: { ...media, assets: [] } };
    await assert.rejects(serveBuiltLocalSurface(empty), /LOCAL_MEDIA_MISMATCH/);
    const serve = { buildDirectory: output, session, port: 0, media };
    server = await serveBuiltLocalSurface(serve);
    const asset = `${server.origin}/media/sample-photo`;
    const full = await fetch(asset);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), original);
    const resized = await fetch(`${asset}?w=160`);
    assert.equal(resized.status, 200);
    assert.equal(resized.headers.get("content-type"), "image/webp");
    const metadata = await sharp(Buffer.from(await resized.arrayBuffer())).metadata();
    assert.equal(metadata.width, 160); assert.equal(metadata.height, 80);
    const head = await fetch(`${asset}?w=160`, { method: "HEAD" });
    assert.equal(head.status, 200); assert.equal(await head.text(), "");
    const range = await fetch(asset, { headers: { range: "bytes=0-7" } });
    assert.equal(range.status, 206); assert.deepEqual(Buffer.from(await range.arrayBuffer()), original.subarray(0, 8));
    assert.equal((await fetch(asset, { headers: { "if-none-match": full.headers.get("etag")! } })).status, 304);
    for (const query of ["?w=161", "?w=160&w=320", "?w=160&path=private-source.png"]) {
      assert.equal((await fetch(asset + query)).status, 400);
    }
    assert.equal((await fetch(asset, { method: "POST" })).status, 405);
    assert.equal((await fetch(`${server.origin}/media/private-source.png`)).status, 404);
    assert.equal((await fetch(`${server.origin}/media/unknown`)).status, 404);
    assert.equal((await fetch(`${server.origin}/LOCAL-MEDIA.json`)).status, 404);
    assert.equal((await fetch(`${server.origin}/media/desert-bank-notebook.svg`)).status, 200, "registered static catalog media remains available");
    writeFileSync(join(directory, "private-source.png"), "changed after mount");
    assert.deepEqual(Buffer.from(await (await fetch(asset)).arrayBuffer()), original, "mounted bytes do not follow later source changes");
    await server.close(); server = undefined;
    await assert.rejects(serveBuiltLocalSurface(serve), /LOCAL_MEDIA_MISMATCH/);
    writeFileSync(join(output, "LOCAL-MEDIA.json"), attestation + " ");
    assert.throws(() => loadVerifiedBuild(output), /BUILD_FILES_MISMATCH/);
  } finally {
    await server?.close(); await controller?.close(); cluster?.dispose();
    rmSync(directory, { recursive: true });
  }
});
