import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, link, mkdtemp, readdir, stat, symlink, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openBlobStore, type BlobBinding, type BlobStore, type HostKeychain } from "../src/storage/blob.ts";
import { signRequest } from "../src/storage/sigv4.ts";
import * as sdk from "../src/index.ts";
import { s3Double } from "./fixtures/s3-double.ts";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const rejectsWith = (code: string, promise: Promise<unknown>) =>
  assert.rejects(promise, (error: unknown) => error instanceof Error && error.message.split(":")[0] === code);
async function* chunked(bytes: Uint8Array, size = 5) {
  for (let offset = 0; offset < bytes.length; offset += size) yield bytes.subarray(offset, offset + size);
}
async function collect(chunks: AsyncIterable<Uint8Array>, into: Uint8Array[] = []) {
  for await (const chunk of chunks) into.push(chunk);
  return Buffer.concat(into);
}
const keychainOf = (entries: Record<string, string>): HostKeychain => Object.freeze({
  async secret(entry: string) {
    const value = entries[entry];
    if (value === undefined) throw new Error(`KEYCHAIN_ENTRY_MISSING: ${entry}`);
    return value;
  },
});
const noKeychain = keychainOf({});

/** One adapter under the contract: how to open it and how to corrupt a stored blob behind its back. */
type Adapter = Readonly<{ open(): Promise<BlobStore>; tamper(digest: string, bytes: Uint8Array): Promise<void>; close(): Promise<void> }>;

function blobContract(name: string, adapter: (context: TestContext) => Promise<Adapter | string>) {
  const run = (title: string, body: (store: BlobStore, subject: Adapter) => Promise<void>) =>
    test(`blob contract [${name}]: ${title}`, async context => {
      const subject = await adapter(context);
      if (typeof subject === "string") return context.skip(subject);
      try { await body(await subject.open(), subject); } finally { await subject.close(); }
    });
  const payload = Buffer.from("content addressed bytes, streamed in several chunks");
  const digest = sha256(payload);

  run("a streamed blob round-trips with its size and bytes", async store => {
    assert.deepEqual(await store.put(digest, chunked(payload), payload.length), { size: payload.length });
    assert.deepEqual(await store.stat(digest), { size: payload.length });
    const read = await store.get(digest);
    assert.equal(read.size, payload.length);
    assert.deepEqual(await collect(read.chunks), payload);
  });
  run("putting the same content twice is idempotent", async store => {
    await store.put(digest, chunked(payload), payload.length);
    assert.deepEqual(await store.put(digest, [payload], payload.length), { size: payload.length });
    assert.deepEqual(await collect((await store.get(digest)).chunks), payload);
  });
  run("the empty blob is a blob", async store => {
    const empty = new Uint8Array(0);
    assert.deepEqual(await store.put(sha256(empty), [], 0), { size: 0 });
    assert.deepEqual(await collect((await store.get(sha256(empty))).chunks), Buffer.alloc(0));
  });
  run("bytes that do not hash to the digest are refused and nothing is stored", async store => {
    await rejectsWith("BLOB_DIGEST_MISMATCH", store.put(sha256(Buffer.from("other")), chunked(payload), payload.length));
    assert.equal(await store.stat(sha256(Buffer.from("other"))), undefined);
  });
  run("more or fewer bytes than declared are refused and nothing is stored", async store => {
    await rejectsWith("BLOB_SIZE_MISMATCH", store.put(digest, chunked(payload), payload.length - 1));
    await rejectsWith("BLOB_SIZE_MISMATCH", store.put(digest, chunked(payload), payload.length + 1));
    assert.equal(await store.stat(digest), undefined);
  });
  run("a digest that is not lower-case sha256 hex is refused before any I/O", async store => {
    for (const invalid of ["../escape", digest.toUpperCase(), digest.slice(1), `${digest}/x`]) {
      await rejectsWith("INVALID_BLOB_DIGEST", store.put(invalid, [payload], payload.length));
      await rejectsWith("INVALID_BLOB_DIGEST", store.get(invalid));
      await rejectsWith("INVALID_BLOB_DIGEST", store.stat(invalid));
      await rejectsWith("INVALID_BLOB_DIGEST", store.delete(invalid));
    }
    for (const size of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) await rejectsWith("INVALID_BLOB_SIZE", store.put(digest, [payload], size));
  });
  run("a missing blob has no stat and cannot be read; delete is idempotent", async store => {
    assert.equal(await store.stat(digest), undefined);
    await rejectsWith("BLOB_NOT_FOUND", store.get(digest));
    await store.put(digest, [payload], payload.length);
    await store.delete(digest);
    assert.equal(await store.stat(digest), undefined);
    await rejectsWith("BLOB_NOT_FOUND", store.get(digest));
    await store.delete(digest);
  });
  run("a blob corrupted behind the store fails integrity and the reader never completes the corrupt copy", async (store, subject) => {
    await store.put(digest, [payload], payload.length);
    const corrupt = Buffer.from(payload); corrupt.writeUInt8(corrupt.readUInt8(0) ^ 0xff, 0);
    await subject.tamper(digest, corrupt);
    const received: Uint8Array[] = [];
    await rejectsWith("BLOB_INTEGRITY_FAILED", store.get(digest).then(read => collect(read.chunks, received)));
    assert.ok(Buffer.concat(received).length < payload.length);
  });
}

async function diskAdapter(): Promise<Adapter> {
  const directory = join(await mkdtemp(join(tmpdir(), "desert-blob-")), "blobs");
  return { open: () => openBlobStore({ adapter: "disk", directory }, { keychain: noKeychain }),
    async tamper(digest, bytes) { await writeFile(join(directory, digest), bytes); }, async close() {} };
}

const bucketSecrets = { "desert.blob.access-key": "AKIADESERTDOUBLE", "desert.blob.secret-key": "double-secret" };
const bucketBinding = (endpoint: string, bucket: string): BlobBinding => ({ adapter: "bucket", endpoint, region: "us-east-1", bucket,
  credentials: { accessKeyId: "desert.blob.access-key", secretAccessKey: "desert.blob.secret-key" } });

async function bucketDoubleAdapter(): Promise<Adapter> {
  const double = await s3Double("desert-test", bucketSecrets["desert.blob.access-key"]);
  return { open: () => openBlobStore(bucketBinding(double.endpoint, "desert-test"), { keychain: keychainOf(bucketSecrets) }),
    async tamper(digest, bytes) { double.objects.set(digest, Buffer.from(bytes)); }, close: double.close };
}

// A real S3-compatible server (minio, garage, …): DESERT_TEST_S3_ENDPOINT, _BUCKET, _ACCESS_KEY, _SECRET_KEY.
async function bucketServerAdapter(): Promise<Adapter | string> {
  const endpoint = process.env.DESERT_TEST_S3_ENDPOINT, bucket = process.env.DESERT_TEST_S3_BUCKET;
  const accessKeyId = process.env.DESERT_TEST_S3_ACCESS_KEY, secretAccessKey = process.env.DESERT_TEST_S3_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return "BLOCKED: no S3-compatible server on this machine (no minio binary, no minio image; pulling one needs owner approval). " +
      "Set DESERT_TEST_S3_ENDPOINT, DESERT_TEST_S3_BUCKET, DESERT_TEST_S3_ACCESS_KEY and DESERT_TEST_S3_SECRET_KEY to run.";
  }
  const secrets = { "desert.blob.access-key": accessKeyId, "desert.blob.secret-key": secretAccessKey };
  return { open: () => openBlobStore(bucketBinding(endpoint, bucket), { keychain: keychainOf(secrets) }),
    async tamper(digest, bytes) {
      // Overwrite the object with bytes that no longer match its name, signed like any client would.
      const url = new URL(`${endpoint}/${bucket}/${digest}`);
      const headers = signRequest({ method: "PUT", url, headers: { "content-length": String(bytes.length) }, payloadHash: "UNSIGNED-PAYLOAD",
        region: "us-east-1", credentials: { accessKeyId, secretAccessKey }, date: new Date() });
      const status = await new Promise<number | undefined>((resolve, reject) => {
        const outgoing = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, { method: "PUT", headers }, response => {
          response.resume(); response.on("end", () => resolve(response.statusCode));
        });
        outgoing.on("error", reject);
        outgoing.end(bytes);
      });
      assert.equal(status, 200);
    }, async close() {} };
}

blobContract("disk", diskAdapter);
blobContract("bucket, loopback S3 double", bucketDoubleAdapter);
blobContract("bucket, S3-compatible server", bucketServerAdapter);

test("disk adapter keeps the private-files hygiene: 0700 root, 0600 blobs, no temporary leftovers", async () => {
  const directory = join(await mkdtemp(join(tmpdir(), "desert-blob-")), "blobs");
  const store = await openBlobStore({ adapter: "disk", directory }, { keychain: noKeychain });
  const bytes = Buffer.from("private"), digest = sha256(bytes);
  await store.put(digest, [bytes], bytes.length);
  await rejectsWith("BLOB_SIZE_MISMATCH", store.put(sha256(Buffer.from("x")), [Buffer.from("xx")], 1));
  assert.equal((await stat(directory)).mode & 0o777, 0o700);
  assert.equal((await stat(join(directory, digest))).mode & 0o777, 0o600);
  assert.deepEqual(await readdir(directory), [digest]);
});

test("disk adapter refuses shared or linked roots and linked blob files", async () => {
  const parent = await mkdtemp(join(tmpdir(), "desert-blob-")), directory = join(parent, "blobs");
  const store = await openBlobStore({ adapter: "disk", directory }, { keychain: noKeychain });
  const bytes = Buffer.from("linked"), digest = sha256(bytes);
  await store.put(digest, [bytes], bytes.length);
  await symlink(directory, join(parent, "alias"));
  await rejectsWith("PRIVATE_ASSET_DIRECTORY_REQUIRED", openBlobStore({ adapter: "disk", directory: join(parent, "alias") }, { keychain: noKeychain }));
  const other = Buffer.from("other"), otherDigest = sha256(other);
  await symlink(join(directory, digest), join(directory, otherDigest));
  await rejectsWith("PRIVATE_ASSET_FILE_REQUIRED", store.get(otherDigest));
  const third = Buffer.from("third"), thirdDigest = sha256(third);
  await link(join(directory, digest), join(directory, thirdDigest));
  await rejectsWith("PRIVATE_ASSET_FILE_REQUIRED", store.get(thirdDigest));
  await chmod(directory, 0o755);
  await rejectsWith("PRIVATE_ASSET_DIRECTORY_REQUIRED", store.get(digest));
  await rejectsWith("PRIVATE_ASSET_DIRECTORY_REQUIRED", openBlobStore({ adapter: "disk", directory }, { keychain: noKeychain }));
});

test("bucket credentials come from the host keychain by entry name and never appear in the binding", async () => {
  const double = await s3Double("desert-test", bucketSecrets["desert.blob.access-key"]);
  try {
    const store = await openBlobStore(bucketBinding(double.endpoint, "desert-test"), { keychain: keychainOf(bucketSecrets) });
    await store.stat(sha256(Buffer.from("absent")));
    assert.match(double.authorizations.at(-1) ?? "", /^AWS4-HMAC-SHA256 Credential=AKIADESERTDOUBLE\//);
    assert.ok(double.authorizations.every(header => !header.includes("double-secret") && !header.includes("desert.blob")));
    await rejectsWith("BLOB_CREDENTIALS_UNAVAILABLE", openBlobStore(bucketBinding(double.endpoint, "desert-test"), { keychain: noKeychain }));
    const inline = { ...bucketBinding(double.endpoint, "desert-test"), secretAccessKey: "inline-secret" };
    await rejectsWith("INVALID_BLOB_BINDING", openBlobStore(inline, { keychain: keychainOf(bucketSecrets) }));
  } finally { await double.close(); }
});

test("the Environment's binding chooses the adapter; the product SDK exposes no storage adapter", async () => {
  const keychain = keychainOf(bucketSecrets);
  await rejectsWith("INVALID_BLOB_BINDING", openBlobStore({ adapter: "ftp", directory: "/tmp" }, { keychain }));
  await rejectsWith("INVALID_BLOB_BINDING", openBlobStore({ ...bucketBinding("http://storage.example.com", "b") }, { keychain }));
  await rejectsWith("INVALID_BLOB_BINDING", openBlobStore({ adapter: "disk", directory: "relative/blobs" }, { keychain }));
  assert.equal(Object.keys(sdk).some(name => /blob/i.test(name)), false);
});
