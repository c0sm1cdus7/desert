import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { postgresCluster } from "./fixtures/postgres.ts";
import { application, privateImagesFixture, ImportPhoto } from "./fixtures/private-images.ts";
import { openLocalController } from "../src/local/controller.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); }); after(() => cluster?.dispose());
test("a controller cannot share a private directory concurrently or rebind it to another database", async () => {
  const f = await privateImagesFixture(cluster);
  try {
    await assert.rejects(openLocalController(application, { ...f.database, roles: ["photos"], privateImages: f.privateImages }), /ASSET_STORE_IN_USE/);
    await f.host.close();
    await assert.rejects(openLocalController(application, { ...await cluster.database(), roles: ["photos"], privateImages: f.privateImages }), /ASSET_INSTALLATION_MISMATCH/);
    const alternative = join(await mkdtemp(join(tmpdir(), "desert-alternate-image-store-")), "assets");
    await assert.rejects(openLocalController(application, { ...f.database, roles: ["photos"],
      privateImages: { ...f.privateImages, directory: alternative } }), /ASSET_STORE_MISMATCH/);
    const reopened = await openLocalController(application, { ...f.database, roles: ["photos"], privateImages: f.privateImages });
    await reopened.close();
  } finally { await f.host.close(); }
});
test("an image role cannot announce ready without its private storage mechanism", async () => {
  await assert.rejects(openLocalController(application, { ...await cluster.database(), roles: ["photos"] }), /PRIVATE_IMAGE_STORAGE_NOT_INSTALLED/);
});
test("closing the host interrupts a stalled upload before releasing its store lease", async () => {
  const f = await privateImagesFixture(cluster);
  try {
    const run = await f.session.begin(ImportPhoto.id), asset = await f.session.reserveImage(run.id, "image", 100);
    let entered: () => void = () => {};
    const reading = new Promise<void>(resolve => { entered = resolve; });
    const source: AsyncIterable<Uint8Array> = { [Symbol.asyncIterator]() {
      return { next() { entered(); return new Promise<IteratorResult<Uint8Array>>(() => {}); } };
    } };
    const pending = f.session.uploadImage(run.id, "image", asset.reference, source);
    const failed = assert.rejects(pending, /ASSET_TRANSFER_CANCELLED/);
    await reading;
    await f.host.close(); await failed;
    const reopened = await openLocalController(application, { ...f.database, roles: ["photos"], privateImages: f.privateImages });
    try {
      assert.deepEqual(await reopened.connect(f.owner.token, "agent").imageStatus(run.id, "image", asset.reference), { state: "failed" });
    } finally { await reopened.close(); }
  } finally { await f.host.close(); }
});
test("invalid uploaded bytes stay charged and cannot be prepared or overwritten", async () => {
  const f = await privateImagesFixture(cluster);
  try {
    const run = await f.session.begin(ImportPhoto.id), bytes = Buffer.from("not an image");
    const asset = await f.session.reserveImage(run.id, "image", bytes.length);
    await assert.rejects(f.session.uploadImage(run.id, "image", asset.reference, [bytes]), /UNSUPPORTED_IMAGE_ASSET/);
    assert.deepEqual(await f.session.imageStatus(run.id, "image", asset.reference), { state: "failed" });
    await assert.rejects(f.session.uploadImage(run.id, "image", asset.reference, [bytes]), /ASSET_UPLOAD_NOT_ADMITTED/);
    await assert.rejects(f.session.prepare(run.id, { title: "Invalid", image: asset }), /IMAGE_ASSET_NOT_READY/);
  } finally { await f.host.close(); }
});
