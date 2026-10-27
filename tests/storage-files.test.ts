// Guard of plan §15, step 7.4: files are objects. A PDF, a ZIP and an image upload through the journey's run, become `asset`
// objects of the uploader with their typed facts, are attached by the accept that writes the owning object (whose file
// column is a foreign key to them), are read back only through a read journey that shows them, by their owner.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { postgresCluster } from "./fixtures/postgres.ts";
import { createServer } from "node:http";
import { once } from "node:events";
import { Files, ReadAttachments, ReadTitles, application, maxBytes, pdf, png, storageFilesFixture, zip } from "./fixtures/storage-files.ts";
import { localWebGateway } from "../src/web/gateway.ts";
import { pcmWave } from "./fixtures/private-media.ts";
import { localDatabase } from "../src/local/database.ts";
import { objectStorage, renderStorageDdl } from "../src/storage/ddl.ts";
import { readAllObjects, readObjects } from "../src/storage/object-store.ts";
import { testInstallation } from "../src/testing/installation.ts";
import { renditionWidths } from "../src/media/rendition-policy.ts";
import { assetDetailFacts } from "../src/assets/object.ts";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const storage = objectStorage(Files, testInstallation);
let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster?.dispose());

test("the SDK declares one asset object table and every file column is a foreign key to it", () => {
  const asset = storage.asset!, attachment = storage.objects.find(object => object.id === "attachment")!;
  assert.equal(storage.objects[0], asset);
  assert.deepEqual(asset.scalars.map(fact => [fact.fact, fact.optional ?? false]), [["digest", false], ["duration", true], ["height", true],
    ["mediaType", false], ["owner", false], ["size", false], ["state", false], ["width", true]]);
  assert.deepEqual(asset.references.map(reference => [reference.fact, reference.target]), [["renditions", "asset"]]);
  assert.equal(asset.owner, "owner");
  assert.deepEqual(attachment.table.foreignKeys.find(key => key.columns[0] === "document")?.references.table.qualifiedName, asset.table.qualifiedName);
  const ddl = renderStorageDdl(storage);
  // The accepted types and the rendition type are the asset's media types, in the policy's order.
  assert.match(ddl, /"media_type" IN \('image\/jpeg', 'image\/png', 'image\/webp', 'application\/pdf', 'application\/zip'\)/);
  assert.match(ddl, /FOREIGN KEY \("document"\) REFERENCES "product_storage_files"\."asset" \("id"\)/);
  assert.doesNotMatch(ddl, /desert_assets/);
});

test("a PDF, a ZIP and an image upload, attach and read back as typed asset objects of their owner", async () => {
  const f = await storageFilesFixture(cluster);
  const database = localDatabase({ ...f.database });
  try {
    const files = { pdf: pdf(), zip: zip(), image: await png() };
    const attached = { pdf: await f.attach(files.pdf, "Contract"), zip: await f.attach(files.zip, "Archive"), image: await f.attach(files.image, "Map") };
    assert.deepEqual([attached.pdf.asset.media, attached.zip.asset.media, attached.image.asset.media], ["document", "archive", "image"]);
    const objects = await database.transaction(client => readAllObjects(client, storage));
    const assets = new Map(objects.filter(record => record.object_type === "asset").map(record => [record.id, record]));
    // One object per file plus one per image rendition, each owned by the uploader and attached.
    assert.equal(assets.size, 3 + renditionWidths.length);
    assert.ok([...assets.values()].every(record => record.facts.owner === f.owner.id && record.facts.state === "attached"));
    for (const [kind, mediaType] of [["pdf", "application/pdf"], ["zip", "application/zip"], ["image", "image/png"]] as const) {
      const record = assets.get(attached[kind].asset.reference)!;
      assert.equal(record.facts.mediaType, mediaType);
      assert.equal(record.facts.size, files[kind].length);
      assert.equal(record.facts.digest, sha256(files[kind]));
      const owning = objects.find(object => object.id === attached[kind].receipt.object.id)!;
      assert.deepEqual(owning.facts.document, attached[kind].asset);
    }
    const image = assets.get(attached.image.asset.reference)!;
    assert.deepEqual([image.facts.width, image.facts.height, "duration" in image.facts], [300, 200, false]);
    const renditions = (image.facts.renditions as string[]).map(id => assets.get(id)!);
    assert.deepEqual(renditions.map(item => item.facts.mediaType), renditionWidths.map(() => "image/webp"));
    assert.ok(renditions.every(item => Number(item.facts.width) <= 300 && (item.facts.renditions as string[]).length === 0));
    assert.deepEqual(assets.get(attached.pdf.asset.reference)!.facts.renditions, []);
    assert.equal("width" in assets.get(attached.zip.asset.reference)!.facts, false);

    for (const kind of ["pdf", "zip", "image"] as const) {
      const read = await f.session.begin(ReadAttachments.id, attached[kind].receipt.object.id);
      const original = await f.session.image(read.id, attached[kind].asset.reference, "original");
      assert.deepEqual(original.bytes, files[kind]);
      // Any file has a default detail: its asset object's facts.
      const detail = await f.session.asset(read.id, attached[kind].asset.reference);
      assert.deepEqual(Object.keys(detail.facts), assetDetailFacts.filter(fact => fact in assets.get(attached[kind].asset.reference)!.facts));
      assert.equal(detail.facts.digest, sha256(files[kind]));
    }
    const read = await f.session.begin(ReadAttachments.id, attached.image.receipt.object.id);
    const preview = await f.session.image(read.id, attached.image.asset.reference, 320);
    assert.equal(preview.mediaType, "image/webp");
    assert.equal(sha256(preview.bytes), renditions[1]!.facts.digest);
    const document = await f.session.begin(ReadAttachments.id, attached.pdf.receipt.object.id);
    await assert.rejects(f.session.image(document.id, attached.pdf.asset.reference, 320), /INVALID_ASSET_VARIANT/);
  } finally { await database.close(); await f.host.close(); }
});

test("another identity, or a read journey that does not show the file, cannot read it", async () => {
  const f = await storageFilesFixture(cluster);
  try {
    const { asset, receipt } = await f.attach(pdf(), "Private");
    const foreign = await f.foreign.begin(ReadAttachments.id);
    await assert.rejects(f.foreign.image(foreign.id, asset.reference, "original"), /NOT_FOUND/);
    await assert.rejects(f.foreign.asset(foreign.id, asset.reference), /NOT_FOUND/);
    await assert.rejects(f.foreign.begin(ReadAttachments.id, receipt.object.id), /NOT_FOUND/);
    const titles = await f.session.begin(ReadTitles.id, receipt.object.id);
    await assert.rejects(f.session.image(titles.id, asset.reference, "original"), /NOT_FOUND/);
    await assert.rejects(f.session.asset(titles.id, asset.reference), /NOT_FOUND/);
    // A file staged by another identity cannot be attached by the owner either.
    const staged = await f.stage(zip(), f.foreign);
    const run = await f.session.begin("attach-file");
    await assert.rejects(f.session.prepare(run.id, { title: "Taken", document: staged.asset }), /NOT_FOUND/);
  } finally { await f.host.close(); }
});

test("over HTTP a document is served through the controller as a sandboxed attachment, an image inline", async () => {
  const f = await storageFilesFixture(cluster);
  const gateway = localWebGateway(f.session, application.digest);
  let origin = "", cookie = "";
  const server = createServer((request, response) => { void gateway.handle(request, response, origin); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TEST_HOST_FAILED");
  origin = `http://127.0.0.1:${address.port}`;
  const call = async (method: string, input: unknown) => {
    const response = await fetch(`${origin}/api/${method}`, { method: "POST", body: JSON.stringify(input), headers: {
      "Content-Type": "application/json", "X-Desert-Contract": application.digest, Origin: origin, ...(cookie ? { Cookie: cookie } : {}) } });
    if (!cookie) cookie = response.headers.get("set-cookie")!.split(";")[0]!;
    return response.json();
  };
  try {
    await call("connect", { invitation: gateway.invitation });
    for (const [bytes, type, disposition] of [[pdf(), "application/pdf", "attachment"], [await png(), "image/png", null]] as const) {
      const { asset, receipt } = await f.attach(bytes, type);
      const read = await call("begin", { journeyId: ReadAttachments.id, subject: receipt.object.id });
      const response = await fetch(`${origin}/api/private-images/${asset.reference}?runId=${read.id}&variant=original`,
        { headers: { Cookie: cookie, "X-Desert-Contract": application.digest } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), type);
      assert.equal(response.headers.get("content-disposition"), disposition);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(response.headers.get("content-security-policy"), "default-src 'none'; sandbox");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    gateway.close(); await f.host.close();
  }
});

test("bytes of a type the fact does not accept, unknown bytes and oversized files are refused before any object exists", async () => {
  const f = await storageFilesFixture(cluster);
  const database = localDatabase({ ...f.database });
  try {
    await assert.rejects(f.stage(pcmWave()), /UNSUPPORTED_FILE_TYPE/);
    await assert.rejects(f.stage(Buffer.from("%PDF-1.4 renamed text without an end marker")), /UNSUPPORTED_MEDIA_ASSET/);
    await assert.rejects(f.stage(zip().subarray(0, 40)), /UNSUPPORTED_MEDIA_ASSET/);
    const run = await f.session.begin("attach-file");
    await assert.rejects(f.session.reserveImage(run.id, "document", maxBytes + 1), /ASSET_SIZE_LIMIT/);
    const assets = await database.transaction(client => readObjects(client, storage.asset!, {}));
    assert.deepEqual(assets, []);
  } finally { await database.close(); await f.host.close(); }
});
