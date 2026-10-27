import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { postgresCluster } from "./fixtures/postgres.ts";
import { privateMediaFixture, mediaApplication, ImportClip, ReadClips, ReadDescriptions, pcmWave, recordedMp4 } from "./fixtures/private-media.ts";
import { privateImagesFixture, ImportPhoto } from "./fixtures/private-images.ts";
import { openLocalController } from "../src/local/controller.ts";
import { inspectPlayableBytes } from "../src/assets/media-processing.ts";
import { assetInputMedia } from "../src/interaction/image-input.ts";
import { mediaTypes } from "../src/media/rendition-policy.ts";
import { file } from "../src/index.ts";
import { emitField } from "../src/schema.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); }); after(() => cluster?.dispose());

test("playable admission derives the kind from bounded bytes, never names or claimed MIME", async () => {
  assert.deepEqual(await inspectPlayableBytes(pcmWave()), { media: "audio", mediaType: "audio/wav", duration: 1 });
  for (const bytes of [Buffer.from("<svg onload='alert(1)'/>"), Buffer.from("<html>renamed.mp4</html>"), pcmWave().subarray(0, 80), Buffer.from("ID3garbage")]) {
    await assert.rejects(inspectPlayableBytes(bytes), /UNSUPPORTED_MEDIA_ASSET/);
  }
  const playable = ["image/jpeg", "image/png", "image/webp", "video/mp4", "audio/mp4", "audio/mpeg", "audio/wav"];
  assert.deepEqual(assetInputMedia(emitField(file({ accept: ["image/jpeg", "image/png", "image/webp", "video/mp4", "audio/mp4", "audio/mpeg", "audio/wav"], maxBytes: 20_971_520 }))), playable);
  assert.deepEqual(assetInputMedia(emitField(file({ accept: ["image/png"], maxBytes: 1 }))), ["image/jpeg", "image/png", "image/webp"]);
  assert.deepEqual(mediaTypes.slice(0, 7), playable);
});

test("private audio is accepted atomically, original-only, identity-scoped, and survives restart", async () => {
  const f = await privateMediaFixture(cluster);
  try {
    const { run, asset } = await f.stage();
    assert.equal(asset.media, "audio");
    assert.deepEqual(await f.session.imageStatus(run.id, "media", asset.reference), { state: "ready", asset });
    const otherRun = await f.session.begin(ImportClip.id);
    await assert.rejects(f.session.prepare(otherRun.id, { description: "Copied", media: asset }), /NOT_FOUND/);
    await assert.rejects(f.session.prepare(run.id, { description: "Lied", media: { ...asset, media: "video" } }), /ASSET_MEDIA_MISMATCH/);
    const intent = await f.session.prepare(run.id, { description: "Silence", media: asset });
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    const detail = await f.session.begin(ReadClips.id, receipt.object.id);
    assert.deepEqual(await f.session.image(detail.id, asset.reference, "original"), { bytes: f.bytes, mediaType: "audio/wav" });
    await assert.rejects(f.session.image(detail.id, asset.reference, 160), /INVALID_ASSET_VARIANT/);
    await assert.rejects(f.foreign.image((await f.foreign.begin(ReadClips.id)).id, asset.reference, "original"), /NOT_FOUND/);
    await assert.rejects(f.session.image((await f.session.begin(ReadDescriptions.id, receipt.object.id)).id, asset.reference, "original"), /NOT_FOUND/);
    await f.host.close();
    const reopened = await openLocalController(mediaApplication, { ...f.database, roles: ["clips"], privateImages: f.privateImages });
    try {
      const session = reopened.connect(f.owner.token, "agent");
      assert.deepEqual(await session.receipt(intent.id), receipt);
      assert.deepEqual((await session.image((await session.begin(ReadClips.id, receipt.object.id)).id, asset.reference, "original")).bytes, f.bytes);
    } finally { await reopened.close(); }
  } finally { await f.host.close(); }
});

test("image-only fields do not gain audio admission from the additive media capability", async () => {
  const f = await privateImagesFixture(cluster);
  try {
    const run = await f.session.begin(ImportPhoto.id), bytes = pcmWave();
    const reserved = await f.session.reserveImage(run.id, "image", bytes.length);
    await assert.rejects(f.session.uploadImage(run.id, "image", reserved.reference, [bytes]));
    assert.notEqual((await f.session.imageStatus(run.id, "image", reserved.reference)).state, "ready");
  } finally { await f.host.close(); }
});

test("real H.264 MP4 survives the private worker, canonical acceptance and authorized delivery", {timeout:60000}, async () => {
  const bytes=await recordedMp4();
  const inspected=await inspectPlayableBytes(bytes);
  assert.equal(inspected.media,"video");assert.equal(inspected.mediaType,"video/mp4");
  assert.equal(inspected.width,64);assert.equal(inspected.height,64);assert.ok(inspected.duration>0);
  await assert.rejects(inspectPlayableBytes(bytes.subarray(0,bytes.length-20)),/UNSUPPORTED_MEDIA_ASSET/);
  const f=await privateMediaFixture(cluster);
  try {
    const run=await f.session.begin(ImportClip.id);
    const reservation=await f.session.reserveImage(run.id,"media",bytes.length);
    const asset=await f.session.uploadImage(run.id,"media",reservation.reference,[bytes]);
    assert.equal(asset.media,"video");
    const intent=await f.session.prepare(run.id,{description:"Colored frames",media:asset});
    const receipt=await f.session.accept(intent.id,intent.confirmationDigest);
    const read=await f.session.begin(ReadClips.id,receipt.object.id);
    assert.deepEqual(await f.session.image(read.id,asset.reference,"original"),{bytes,mediaType:"video/mp4"});
  } finally {await f.host.close();}
});
