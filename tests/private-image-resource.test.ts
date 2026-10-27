import assert from "node:assert/strict";
import test from "node:test";
import { assetReference } from "../src/assets/types.ts";
import { privateImageResource } from "../src/svelte/infra/private-image-resource.ts";
import { privateImageAccess } from "../src/web/client/private-images.ts";
import type { AssetReference, AssetImageVariant } from "../src/assets/types.ts";

const first = assetReference("00000000-0000-0000-0000-000000000001");
const second = assetReference("00000000-0000-0000-0000-000000000002");
function access(read: (asset: AssetReference, variant: AssetImageVariant, signal?: AbortSignal) => Promise<Blob>) {
  return privateImageAccess(asset => ({ valid: () => true, read: (variant, signal) => read(asset, variant, signal) }));
}

test("private pixels are revoked on identity change and late replies never become visible", async () => {
  const reads: { reference: string; signal: AbortSignal; resolve: (blob: Blob) => void }[] = [];
  const revoked: string[] = []; let next = 0;
  const resource = privateImageResource(access((asset, _variant, signal) => new Promise(resolve => {
    reads.push({ reference: asset.reference, signal: signal!, resolve });
  })), () => {}, { create: () => `blob:${++next}`, revoke: value => revoked.push(value) });
  const old = resource.load(first, 320);
  const current = resource.load(second, 640);
  assert.equal(reads[0]!.signal.aborted, true);
  reads[0]!.resolve(new Blob(["old identity"])); await old;
  assert.equal(resource.url, undefined);
  reads[1]!.resolve(new Blob(["current identity"])); await current;
  assert.equal(resource.url, "blob:1");
  resource.clear();
  assert.equal(resource.url, undefined);
  assert.deepEqual(revoked, ["blob:1"]);
});

test("a larger rendition retains only the same asset, then releases its previous blob", async () => {
  const pending: ((blob: Blob) => void)[] = [], revoked: string[] = []; let next = 0;
  const resource = privateImageResource(access(() => new Promise(resolve => pending.push(resolve))), () => {},
    { create: () => `blob:${++next}`, revoke: value => revoked.push(value) });
  const small = resource.load(first, 320); pending[0]!(new Blob(["small"])); await small;
  const large = resource.load(first, 1920);
  assert.equal(resource.url, "blob:1");
  pending[1]!(new Blob(["large"])); await large;
  assert.equal(resource.url, "blob:2"); assert.deepEqual(revoked, ["blob:1"]);
  resource.clear(); assert.deepEqual(revoked, ["blob:1", "blob:2"]);
});

test("private image errors expose no URL and disposal cancels an in-flight read", async () => {
  const resource = privateImageResource(access(async () => { throw new Error("forbidden"); }), () => {});
  await resource.load(first, 320);
  assert.equal(resource.url, undefined); assert.equal(resource.failed, true);
  resource.clear(); assert.equal(resource.failed, false);
});
