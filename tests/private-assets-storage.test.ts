import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { openPrivateAssetStore } from "../src/assets/storage.ts";
import { optimizePrivateImage } from "../src/assets/image.ts";

async function fixture() {
  const parent = await mkdtemp(join(tmpdir(), "desert-private-assets-"));
  return { parent, store: await openPrivateAssetStore(join(parent, "assets")) };
}
test("private originals remain byte-identical and derivatives are durable, bounded and stripped of EXIF", async () => {
  const { parent, store } = await fixture(), reference = randomUUID();
  const original = await sharp({ create: { width: 600, height: 300, channels: 4, background: "#2468ac80" } })
    .png().withMetadata({ orientation: 6 }).toBuffer();
  await store.allocate(reference);
  const stored = await store.writeOriginal(reference, [original], original.length);
  assert.equal(stored.digest, createHash("sha256").update(original).digest("hex"));
  assert.deepEqual(await store.read(reference, "original", stored), original);
  const image = await optimizePrivateImage(store, reference, stored);
  assert.equal(image.mediaType, "image/png");
  assert.deepEqual([image.width, image.height], [300, 600]);
  assert.equal(image.renditions.length, 6);
  for (const rendition of image.renditions) {
    const bytes = await store.read(reference, rendition.edge, rendition);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "webp"); assert.equal(metadata.exif, undefined);
    assert.ok(metadata.width! <= rendition.edge && metadata.height! <= rendition.edge);
  }
  assert.equal((await stat(join(parent, "assets"))).mode & 0o777, 0o700);
  assert.equal((await stat(join(parent, "assets", reference, "original"))).mode & 0o777, 0o600);
  const reopened = await openPrivateAssetStore(join(parent, "assets"));
  assert.equal(reopened.id, store.id);
  assert.deepEqual(await reopened.read(reference, "original", stored), original);
  await assert.rejects(store.writeOriginal(reference, [Buffer.from("replacement")], 11), /ASSET_FILE_EXISTS/);
  assert.deepEqual(await readFile(join(parent, "assets", reference, "original")), original);
});
test("private storage rejects unsafe roots, traversal, size mismatches, corruption and linked files", async () => {
  const { parent, store } = await fixture();
  const linked = join(parent, "linked"); await symlink(join(parent, "assets"), linked);
  await assert.rejects(openPrivateAssetStore(linked), /PRIVATE_ASSET_DIRECTORY_REQUIRED/);
  await chmod(join(parent, "assets"), 0o755);
  await assert.rejects(openPrivateAssetStore(join(parent, "assets")), /PRIVATE_ASSET_DIRECTORY_REQUIRED/);
  await chmod(join(parent, "assets"), 0o700);
  await assert.rejects(store.allocate("../escape"), /INVALID_ASSET_REFERENCE/);
  const reference = randomUUID(); await store.allocate(reference);
  await assert.rejects(store.writeOriginal(reference, [Buffer.from("oversized")], 3), /ASSET_SIZE_MISMATCH/);
  await assert.rejects(store.read(reference, "original", { digest: "0".repeat(64), size: 3 }), /ASSET_INTEGRITY_FAILED/);
  const another = randomUUID(); await store.allocate(another);
  const bytes = Buffer.from("valid"), metadata = await store.writeOriginal(another, [bytes], bytes.length);
  await assert.rejects(store.read(another, "original", { ...metadata, digest: "0".repeat(64) }), /ASSET_INTEGRITY_FAILED/);
  const third = randomUUID(); await store.allocate(third);
  await symlink(join(parent, "assets", another, "original"), join(parent, "assets", third, "original"));
  await assert.rejects(store.read(third, "original", metadata), /ELOOP/);
});
test("concurrent writers cannot replace the first original, including a failed partial writer", async () => {
  const { store } = await fixture(), reference = randomUUID();
  await store.allocate(reference);
  const first = Buffer.from("first"), second = Buffer.from("other");
  const results = await Promise.allSettled([store.writeOriginal(reference, [first], 5), store.writeOriginal(reference, [second], 5)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected" && /ASSET_FILE_EXISTS/.test(String(result.reason))).length, 1);
  const winner = results[0]!.status === "fulfilled" ? first : second;
  const stored = results.find(result => result.status === "fulfilled")!;
  assert.equal(stored.status, "fulfilled");
  if (stored.status === "fulfilled") assert.deepEqual(await store.read(reference, "original", stored.value), winner);
  const partial = randomUUID(); await store.allocate(partial);
  await assert.rejects(store.writeOriginal(partial, [Buffer.from("part")], 5), /ASSET_SIZE_MISMATCH/);
  await assert.rejects(store.writeOriginal(partial, [first], 5), /ASSET_FILE_EXISTS/);
});
test("image import inspects bytes and refuses unsupported or animated images before publishing renditions", async () => {
  const { store } = await fixture();
  for (const bytes of [Buffer.from("not a photo"), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
    Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")]) {
    const reference = randomUUID(); await store.allocate(reference);
    const metadata = await store.writeOriginal(reference, [bytes], bytes.length);
    await assert.rejects(optimizePrivateImage(store, reference, metadata), /UNSUPPORTED_IMAGE_ASSET/);
  }
});
test("cancelling active image work terminates its worker before the next queued image can complete", async () => {
  const { store } = await fixture();
  const bytes = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#4689ab" } }).png().toBuffer();
  const first = randomUUID(), second = randomUUID();
  await store.allocate(first); await store.allocate(second);
  const original = await store.writeOriginal(first, [bytes], bytes.length);
  await store.writeOriginal(second, [bytes], bytes.length);
  const controller = new AbortController();
  const cancelled = optimizePrivateImage(store, first, original, controller.signal);
  const queued = optimizePrivateImage(store, second, original);
  controller.abort();
  await assert.rejects(cancelled, /ASSET_PROCESSING_CANCELLED/);
  assert.equal((await queued).renditions.length, 6);
});
