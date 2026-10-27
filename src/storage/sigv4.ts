// Law: requests to an S3-compatible bucket are signed with AWS Signature Version 4 (single-chunk payload).
// The credentials are a parameter of each call; nothing here stores or reads a secret.
import { createHash, createHmac } from "node:crypto";

export type SigningCredentials = Readonly<{ accessKeyId: string; secretAccessKey: string }>;
export type SigningRequest = Readonly<{
  method: string;
  url: URL;
  /** Extra headers to sign and send, e.g. content-length or range. */
  headers: Readonly<Record<string, string>>;
  /** Hex sha256 of the body, or "UNSIGNED-PAYLOAD". */
  payloadHash: string;
  region: string;
  credentials: SigningCredentials;
  date: Date;
}>;
export type SignedHeaders = Readonly<Record<string, string> & { authorization: string }>;

const service = "s3";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest();
/** RFC 3986 unreserved characters stay; everything else is percent-encoded (S3 encodes each path segment once). */
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, character =>
  `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

function canonicalPath(url: URL) {
  return url.pathname.split("/").map(segment => encode(decodeURIComponent(segment))).join("/");
}
/** Code-point order, never locale order: the signature must not depend on the host's locale. */
function byKeyThenValue(left: readonly [string, string], right: readonly [string, string]) {
  if (left[0] !== right[0]) return left[0] < right[0] ? -1 : 1;
  if (left[1] === right[1]) return 0;
  return left[1] < right[1] ? -1 : 1;
}
function canonicalQuery(url: URL) {
  return [...url.searchParams].map(([key, value]) => [encode(key), encode(value)] as const)
    .sort(byKeyThenValue).map(([key, value]) => `${key}=${value}`).join("&");
}

export function signRequest(request: SigningRequest): SignedHeaders {
  const amzDate = request.date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const headers: Record<string, string> = { host: request.url.host, "x-amz-content-sha256": request.payloadHash, "x-amz-date": amzDate };
  for (const [name, value] of Object.entries(request.headers)) headers[name.toLowerCase()] = value.trim().replace(/\s+/g, " ");
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(";");
  const canonical = [request.method, canonicalPath(request.url), canonicalQuery(request.url),
    names.map(name => `${name}:${headers[name]}\n`).join(""), signedHeaders, request.payloadHash].join("\n");
  const scope = `${day}/${request.region}/${service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${request.credentials.secretAccessKey}`, day), request.region), service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  return Object.freeze({ ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${request.credentials.accessKeyId}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}` });
}
