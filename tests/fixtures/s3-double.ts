// A loopback S3 protocol double for the bucket adapter contract: path-style PUT/GET/HEAD/DELETE of one bucket.
// It checks what S3 checks without a key: SigV4 header shape, the access key id, Content-Length and
// x-amz-content-sha256 against the received bytes. It does NOT verify the HMAC signature itself;
// tests/storage-sigv4.test.ts proves the signer against AWS's published examples.
import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export type S3Double = Readonly<{ endpoint: string; objects: Map<string, Buffer>; authorizations: string[]; close(): Promise<void> }>;

const failure = (response: ServerResponse, status: number, code: string) => {
  response.writeHead(status, { "content-type": "application/xml" });
  response.end(`<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code></Error>`);
};

export async function s3Double(bucket: string, accessKeyId: string): Promise<S3Double> {
  const objects = new Map<string, Buffer>(), authorizations: string[] = [];
  async function handle(request: IncomingMessage, response: ServerResponse) {
    const authorization = request.headers.authorization ?? "";
    authorizations.push(authorization);
    const shape = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/\d{8}\/[a-z0-9-]+\/s3\/aws4_request,SignedHeaders=[a-z0-9;-]+,Signature=[0-9a-f]{64}$/.exec(authorization);
    if (!shape || shape[1] !== accessKeyId || !request.headers["x-amz-date"]) return failure(response, 403, "SignatureDoesNotMatch");
    const path = new URL(request.url ?? "/", "http://double").pathname.split("/");
    if (path[1] !== bucket || path.length !== 3 || !path[2]) return failure(response, 404, "NoSuchBucket");
    const key = decodeURIComponent(path[2]);
    if (request.method === "PUT") {
      const declared = Number(request.headers["content-length"]);
      if (!Number.isSafeInteger(declared)) return failure(response, 411, "MissingContentLength");
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (body.length !== declared) return failure(response, 400, "IncompleteBody");
      const claimed = request.headers["x-amz-content-sha256"];
      if (claimed !== "UNSIGNED-PAYLOAD" && claimed !== createHash("sha256").update(body).digest("hex")) {
        return failure(response, 400, "XAmzContentSHA256Mismatch");
      }
      objects.set(key, body);
      response.writeHead(200).end();
      return;
    }
    const stored = objects.get(key);
    if (request.method === "DELETE") { objects.delete(key); response.writeHead(204).end(); return; }
    if (!stored) return request.method === "HEAD" ? void response.writeHead(404).end() : failure(response, 404, "NoSuchKey");
    response.writeHead(200, { "content-length": stored.length });
    response.end(request.method === "HEAD" ? undefined : stored);
  }
  const server = createServer((request, response) => {
    handle(request, response).catch(() => { if (!response.headersSent) failure(response, 500, "InternalError"); else response.destroy(); });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("S3_DOUBLE_ADDRESS");
  return Object.freeze({ endpoint: `http://127.0.0.1:${address.port}`, objects, authorizations,
    close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) });
}
