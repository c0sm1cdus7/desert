import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { postgresCluster } from "./fixtures/postgres.ts";
import { application, ImportPhoto } from "./fixtures/private-images.ts";
import { openLocalController } from "../src/local/controller.ts";
import { localDatabase } from "../src/local/database.ts";
import { localProgram } from "../src/local/program.ts";
import { openPrivateAssetStore } from "../src/assets/storage.ts";
import { installPrivateAssetStore } from "../src/assets/installation.ts";
import { reservePrivateAsset, privateAssetRecord, type AssetScope } from "../src/assets/records.ts";
import { claimPrivateAssetUpload, completePrivateAssetUpload, failPrivateAssetUpload } from "../src/assets/staging.ts";
import { optimizePrivateImage } from "../src/assets/image.ts";
import type { ImageAssetMetadata } from "../src/assets/types.ts";
import { imageMediaTypes } from "../src/media/rendition-policy.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster?.dispose());
const quota = { totalBytes: 512 * 1024 * 1024, identityBytes: 256 * 1024 * 1024, totalAssets: 4, identityAssets: 2 };
async function fixture() {
  const options = await cluster.database(), database = localDatabase(options);
  const directory = join(await mkdtemp(join(tmpdir(), "desert-assets-ledger-")), "assets");
  // The host installs the store and the product's tables (its photo and asset objects); the test drives the store itself.
  const host = await openLocalController(application, { ...options, roles: ["photos"], privateImages: { directory, quota } });
  const program = localProgram(application, ["photos"], options.installation);
  const owner = await host.identities.issue("Owner"), other = await host.identities.issue("Other");
  const store = await openPrivateAssetStore(directory);
  // Ledger tests exercise transaction primitives below input admission.
  async function scope(identity = owner): Promise<AssetScope> {
    const run = await host.connect(identity.token, "agent").begin(ImportPhoto.id);
    return { actor: identity.id, surface: "agent", runId: run.id, inputField: "image", contractDigest: application.digest, storeId: store.id,
      accept: imageMediaTypes, maxBytes: 20 * 1024 * 1024 };
  }
  return { database, host, program, owner, other, store, scope, close: async () => { await host.close(); await database.close(); } };
}
test("asset reservations preserve occurrence identity, scope and quota under concurrent admission", async () => {
  const f = await fixture();
  try {
    const scope = await f.scope();
    const reserve = () => f.database.transaction(client => reservePrivateAsset(client, scope, 100));
    const [a, b] = await Promise.all([reserve(), reserve()]); assert.equal(a.id, b.id);
    await assert.rejects(f.database.transaction(client => reservePrivateAsset(client, scope, 101)), /ASSET_RESERVATION_CONFLICT/);
    await assert.rejects(f.database.transaction(client => reservePrivateAsset(client, { ...scope, actor: f.other.id }, 100)), /NOT_FOUND/);
    await assert.rejects(f.database.transaction(client => reservePrivateAsset(client, { ...scope, surface: "human" }, 100)), /NOT_FOUND/);
    await assert.rejects(f.database.transaction(client => reservePrivateAsset(client, { ...scope, contractDigest: "different" }, 100)), /CONTRACT_MISMATCH/);
    await assert.rejects(f.database.transaction(client => privateAssetRecord(client, { ...scope, inputField: "other" }, a.id)), /NOT_FOUND/);
    const scopes = await Promise.all([f.scope(), f.scope()]);
    const outcomes = await Promise.allSettled(scopes.map(next => f.database.transaction(client => reservePrivateAsset(client, next, 100))));
    assert.equal(outcomes.filter(result => result.status === "fulfilled").length, 1);
    const rejected = outcomes.find(result => result.status === "rejected");
    assert.match(String(rejected?.reason), /ASSET_QUOTA_EXCEEDED/);
    const other = await f.scope(f.other);
    assert.ok((await f.database.transaction(client => reservePrivateAsset(client, other, 100))).id);
  } finally { await f.close(); }
});
test("only durable optimized bytes complete a reservation; failures keep charged capacity and cannot be retried in place", async () => {
  const f = await fixture();
  try {
    const scope = await f.scope(), bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#3674b0" } }).png().toBuffer();
    const record = await f.database.transaction(client => reservePrivateAsset(client, scope, bytes.length));
    await f.database.transaction(client => claimPrivateAssetUpload(client, scope, record.id));
    await assert.rejects(f.database.transaction(client => claimPrivateAssetUpload(client, scope, record.id)), /ASSET_UPLOAD_IN_PROGRESS/);
    await assert.rejects(f.database.transaction(client => completePrivateAssetUpload(client, f.program, scope, record.id, {} as ImageAssetMetadata)), /UNVERIFIED_IMAGE_ASSET/);
    await f.store.allocate(record.id);
    const original = await f.store.writeOriginal(record.id, [bytes.subarray(0, 10), bytes.subarray(10)], bytes.length);
    const image = await optimizePrivateImage(f.store, record.id, original);
    await assert.rejects(f.database.transaction(client => completePrivateAssetUpload(client, f.program, scope, record.id, structuredClone(image))), /UNVERIFIED_IMAGE_ASSET/);
    await f.database.transaction(client => completePrivateAssetUpload(client, f.program, scope, record.id, image));
    const ready = await f.database.transaction(client => privateAssetRecord(client, scope, record.id));
    assert.equal(ready.state, "ready"); assert.deepEqual(ready.metadata, image);
    assert.equal(Number(ready.reserved_bytes), bytes.length + image.renditions.reduce((total, value) => total + value.size, 0));
    const failedScope = await f.scope(), failed = await f.database.transaction(client => reservePrivateAsset(client, failedScope, 100));
    await f.database.transaction(client => claimPrivateAssetUpload(client, failedScope, failed.id));
    await f.database.transaction(client => failPrivateAssetUpload(client, failedScope, failed.id));
    const stored = await f.database.transaction(client => privateAssetRecord(client, failedScope, failed.id));
    assert.equal(stored.state, "failed"); assert.equal(stored.reserved_bytes, failed.reserved_bytes);
    await assert.rejects(f.database.transaction(client => claimPrivateAssetUpload(client, failedScope, failed.id)), /ASSET_UPLOAD_NOT_ADMITTED/);
    const nextScope = await f.scope();
    await assert.rejects(f.database.transaction(client => reservePrivateAsset(client, nextScope, 1)), /ASSET_QUOTA_EXCEEDED/);
  } finally { await f.close(); }
});
test("asset ledger does not silently replace storage or quota and rejects expired runs", async () => {
  const f = await fixture();
  try {
    await f.database.transaction(client => installPrivateAssetStore(client, f.store.id, quota));
    await assert.rejects(f.database.transaction(client => installPrivateAssetStore(client, f.owner.id, quota)), /ASSET_STORE_MISMATCH/);
    await assert.rejects(f.database.transaction(client => installPrivateAssetStore(client, f.store.id, { ...quota, totalAssets: 5 })), /ASSET_QUOTA_MISMATCH/);
    const scope = await f.scope();
    await f.database.transaction(client => client.query("UPDATE desert_runs SET expires_at = clock_timestamp() - interval '1 second' WHERE id = $1", [scope.runId]));
    await assert.rejects(f.database.transaction(client => reservePrivateAsset(client, scope, 1)), /RUN_EXPIRED/);
    const { rows } = await f.database.transaction(client => client.query("SELECT * FROM desert_assets"));
    assert.deepEqual(rows, []);
  } finally { await f.close(); }
});
