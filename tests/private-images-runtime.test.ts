import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import sharp from "sharp";
import { postgresCluster } from "./fixtures/postgres.ts";
import { privateImagesFixture, application, ImportPhoto, ReadPhotos, ReadTitles, ArchivePhoto } from "./fixtures/private-images.ts";
import { openLocalController } from "../src/local/controller.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); }); after(() => cluster?.dispose());
test("an admitted image input becomes a private object only on canonical acceptance, then survives restart", async () => {
  const f = await privateImagesFixture(cluster);
  try {
    const { run, asset } = await f.stage();
    const read = await f.session.begin(ReadPhotos.id);
    assert.deepEqual(await f.session.read(read.id), []);
    await assert.rejects(f.session.image(read.id, asset.reference, 160), /NOT_FOUND/);
    const intent = await f.session.prepare(run.id, { title: "Private image", image: asset });
    assert.deepEqual(intent.facts.image, asset);
    const receipts = await Promise.all([f.session.accept(intent.id, intent.confirmationDigest), f.session.accept(intent.id, intent.confirmationDigest)]);
    assert.deepEqual(receipts[0], receipts[1]);
    assert.deepEqual((await f.session.read(read.id))[0]!.facts, { title: "Private image" });
    const detail = await f.session.begin(ReadPhotos.id, receipts[0]!.object.id);
    assert.deepEqual((await f.session.read(detail.id))[0]!.facts, { title: "Private image", image: asset });
    assert.deepEqual((await f.session.image(detail.id, asset.reference, "original")).bytes, f.bytes);
    const preview = await f.session.image(detail.id, asset.reference, 160);
    const metadata = await sharp(preview.bytes).metadata();
    assert.equal(preview.mediaType, "image/webp"); assert.equal(metadata.width, 160); assert.equal(metadata.exif, undefined);
    assert.deepEqual(await f.session.imageStatus(run.id, "image", asset.reference), { state: "attached", asset });
    await f.host.close();
    const reopened = await openLocalController(application, { ...f.database, roles: ["photos"], privateImages: f.privateImages });
    try {
      const session = reopened.connect(f.owner.token, "agent");
      assert.deepEqual(await session.receipt(intent.id), receipts[0]);
      assert.deepEqual((await session.image((await session.begin(ReadPhotos.id, receipts[0]!.object.id)).id, asset.reference, "original")).bytes, f.bytes);
    } finally { await reopened.close(); }
  } finally { await f.host.close(); }
});
test("references never grant cross-identity, cross-run, scalar-input or unpublished-field authority", async () => {
  const f = await privateImagesFixture(cluster);
  try {
    const { run, asset } = await f.stage(), otherRun = await f.session.begin(ImportPhoto.id);
    await assert.rejects(f.session.reserveImage(otherRun.id, "title", 10), /INVALID_ASSET_INPUT/);
    await assert.rejects(f.foreign.imageStatus(run.id, "image", asset.reference), /NOT_FOUND/);
    await assert.rejects(f.session.prepare(otherRun.id, { title: "Copied locator", image: asset }), /NOT_FOUND/);
    await assert.rejects(f.session.prepare(otherRun.id, { title: "Invented", image: { kind: "asset", reference: randomUUID() } }), /NOT_FOUND/);
    const intent = await f.session.prepare(run.id, { title: "Scoped", image: asset });
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    await assert.rejects(f.foreign.image((await f.foreign.begin(ReadPhotos.id)).id, asset.reference, 160), /NOT_FOUND/);
    await assert.rejects(f.session.image((await f.session.begin(ReadTitles.id, receipt.object.id)).id, asset.reference, 160), /NOT_FOUND/);
    const allowed = await f.session.begin(ReadPhotos.id, receipt.object.id);
    assert.ok((await f.session.image(allowed.id, asset.reference, 160)).bytes.length);
    const archive = await f.session.prepare((await f.session.begin(ArchivePhoto.id, receipt.object.id)).id, {});
    await f.session.accept(archive.id, archive.confirmationDigest);
    await assert.rejects(f.session.image(allowed.id, asset.reference, 160), /NOT_FOUND/);
  } finally { await f.host.close(); }
});
test("asset linking, object change and receipt share a transaction; failed acceptance can retry the same intent", async () => {
  const f = await privateImagesFixture(cluster);
  const admin = new Pool({ host: f.database.socketDirectory, database: f.database.database, user: f.database.user });
  try {
    const { run, asset } = await f.stage();
    const intent = await f.session.prepare(run.id, { title: "Atomic image", image: asset });
    await admin.query(`CREATE FUNCTION reject_image_receipt() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'receipt fault'; END $$;
      CREATE TRIGGER image_receipt_fault BEFORE INSERT ON desert_receipts FOR EACH ROW EXECUTE FUNCTION reject_image_receipt()`);
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /receipt fault/);
    assert.equal((await admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
    assert.equal((await admin.query("SELECT count(*) FROM desert_asset_links")).rows[0].count, "0");
    assert.equal((await f.session.imageStatus(run.id, "image", asset.reference)).state, "ready");
    await admin.query("DROP TRIGGER image_receipt_fault ON desert_receipts");
    await f.session.accept(intent.id, intent.confirmationDigest);
    assert.equal((await admin.query("SELECT count(*) FROM desert_asset_links")).rows[0].count, "1");
  } finally { await admin.end(); await f.host.close(); }
});
test("accepted metadata cannot change after preparation, and revocation during upload never publishes ready data", async () => {
  const f = await privateImagesFixture(cluster);
  const admin = new Pool({ host: f.database.socketDirectory, database: f.database.database, user: f.database.user });
  try {
    const first = await f.stage();
    const intent = await f.session.prepare(first.run.id, { title: "Bound original", image: first.asset });
    await admin.query("UPDATE desert_assets SET metadata = jsonb_set(metadata, '{width}', '999') WHERE id = $1", [first.asset.reference]);
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /EFFECT_CHANGED/);
    const run = await f.session.begin(ImportPhoto.id), asset = await f.session.reserveImage(run.id, "image", f.bytes.length);
    const revokedBytes = async function* () { await f.host.identities.revoke(f.owner.id); yield f.bytes; };
    await assert.rejects(f.session.uploadImage(run.id, "image", asset.reference, revokedBytes()), /UNAUTHENTICATED/);
    const { rows: [record] } = await admin.query("SELECT state, reserved_bytes, metadata FROM desert_assets WHERE id = $1", [asset.reference]);
    assert.notEqual(record.state, "ready"); assert.equal(record.metadata, null); assert.ok(Number(record.reserved_bytes) > f.bytes.length);
    assert.equal((await admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
  } finally { await admin.end(); await f.host.close(); }
});
