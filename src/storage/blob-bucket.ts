// Law: the bucket adapter speaks the S3 protocol (path-style, SigV4) and asks the host keychain for its keys on every
// request; no key is held in a binding, a product or this module. Raises BLOB_NOT_FOUND, BLOB_CREDENTIALS_UNAVAILABLE,
// BLOB_DIGEST_MISMATCH and BLOB_BUCKET_FAILED (the S3 status and error code, verbatim).
import { once } from "node:events";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { BlobStore, BucketBinding, HostKeychain } from "./blob.ts";
import { putMismatch, readMismatch, requireBlobDigest, requireBlobSize, verifiedChunks, type BlobSource } from "./blob-verify.ts";
import { signRequest, type SigningCredentials } from "./sigv4.ts";

const emptyPayload = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

async function send(url: URL, method: string, headers: Readonly<Record<string, string>>, body?: AsyncIterable<Uint8Array>) {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const outgoing = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, { method, headers }, resolve);
    outgoing.on("error", reject);
    if (!body) { outgoing.end(); return; }
    (async () => {
      for await (const chunk of body) if (!outgoing.write(chunk)) await once(outgoing, "drain");
      outgoing.end();
    })().catch(error => { reject(error); outgoing.destroy(error); });
  });
}

async function drain(response: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of response) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function failure(response: IncomingMessage, method: string): Promise<never> {
  const code = /<Code>([^<]{1,128})<\/Code>/.exec(await drain(response))?.[1] ?? "no S3 error code";
  if (code === "XAmzContentSHA256Mismatch") throw new Error("BLOB_DIGEST_MISMATCH: the bucket rejected the payload hash");
  throw new Error(`BLOB_BUCKET_FAILED: ${method} answered ${response.statusCode} ${code}`);
}

export async function openBucketBlobStore(binding: BucketBinding, keychain: HostKeychain): Promise<BlobStore> {
  async function credentials(): Promise<SigningCredentials> {
    try {
      return { accessKeyId: await keychain.secret(binding.credentials.accessKeyId),
        secretAccessKey: await keychain.secret(binding.credentials.secretAccessKey) };
    } catch (error) {
      throw new Error("BLOB_CREDENTIALS_UNAVAILABLE: the host keychain did not provide the bucket keys", { cause: error });
    }
  }
  await credentials();
  const base = binding.endpoint.replace(/\/$/, "");
  async function call(method: string, digest: string, extra: Readonly<Record<string, string>> = {}, payloadHash = emptyPayload,
    body?: AsyncIterable<Uint8Array>) {
    const url = new URL(`${base}/${binding.bucket}/${digest}`);
    const headers = signRequest({ method, url, headers: extra, payloadHash, region: binding.region, credentials: await credentials(), date: new Date() });
    return send(url, method, headers, body);
  }
  async function head(digest: string) {
    const response = await call("HEAD", digest);
    await drain(response);
    if (response.statusCode === 404) return undefined;
    if (response.statusCode !== 200) return failure(response, "HEAD");
    const size = Number(response.headers["content-length"]);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("BLOB_BUCKET_FAILED: HEAD answered without a content length");
    return Object.freeze({ size });
  }
  async function* objectChunks(digest: string): AsyncGenerator<Uint8Array> {
    const response = await call("GET", digest);
    if (response.statusCode === 404) { await drain(response); throw new Error("BLOB_NOT_FOUND: no blob with this digest"); }
    if (response.statusCode !== 200) return failure(response, "GET");
    for await (const chunk of response) yield chunk;
  }
  return Object.freeze({
    async put(digest: string, source: BlobSource, size: number) {
      requireBlobDigest(digest); requireBlobSize(size);
      // The digest is the payload hash: the bucket re-checks the bytes against their name.
      const response = await call("PUT", digest, { "content-length": String(size) }, digest, verifiedChunks(source, digest, size, putMismatch));
      if (response.statusCode !== 200) return failure(response, "PUT");
      await drain(response);
      return Object.freeze({ size });
    },
    async get(digest: string) {
      requireBlobDigest(digest);
      const found = await head(digest);
      if (!found) throw new Error("BLOB_NOT_FOUND: no blob with this digest");
      return Object.freeze({ size: found.size, chunks: verifiedChunks(objectChunks(digest), digest, found.size, readMismatch) });
    },
    async stat(digest: string) { requireBlobDigest(digest); return head(digest); },
    async delete(digest: string) {
      requireBlobDigest(digest);
      const response = await call("DELETE", digest);
      if (response.statusCode !== 204 && response.statusCode !== 200 && response.statusCode !== 404) return failure(response, "DELETE");
      await drain(response);
    },
  });
}
