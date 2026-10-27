// A real S3-compatible server for the bucket adapter contract (plan §15, step 7.5): Garage, from its official image at one
// pinned version, started in a throwaway container with credentials generated here and never written anywhere but the
// container's own temporary config. The same code runs on a laptop with Docker (OrbStack) and in CI (gate.yml pre-pulls
// the image with `node tests/fixtures/s3-server.ts --pull`). MinIO no longer publishes pullable images, so it is not used.
// An external server can be named instead with DESERT_TEST_S3_ENDPOINT, _ACCESS_KEY and _SECRET_KEY (its key must be
// allowed to create buckets). DESERT_TEST_S3_REQUIRED=1 turns "no server" into a failure instead of a skip.
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { signRequest, type SigningCredentials } from "../../src/storage/sigv4.ts";

/** The one place the image is named: an exact release and its digest. */
export const s3ServerImage = "dxflrs/garage:v2.4.1@sha256:9c96caa2612d3411acc5b0e6701fb238dbfba33e533a6d7d3d811a4b12d0d020";
export const s3ServerRegion = "us-east-1";
const limits = ["--cpus", "2", "--memory", "2g"];
const run = promisify(execFile);
const docker = async (...args: string[]) => (await run("docker", args, { timeout: 120_000 })).stdout.trim();

export type S3Server = Readonly<{
  endpoint: string; credentials: SigningCredentials;
  /** A new, empty bucket for one test, created through the S3 API with the server's key. */
  createBucket(): Promise<string>;
  /** Sends one signed request and answers its status (the test's own client, e.g. to tamper with an object). */
  send(method: string, path: string, body?: Uint8Array, payloadHash?: string): Promise<number>;
  close(): Promise<void>;
}>;

function sender(endpoint: string, credentials: SigningCredentials) {
  return (method: string, path: string, body = new Uint8Array(0), payloadHash = "UNSIGNED-PAYLOAD") => {
    const url = new URL(`${endpoint.replace(/\/$/, "")}${path}`);
    const headers = signRequest({ method, url, headers: { "content-length": String(body.length) }, payloadHash, region: s3ServerRegion,
      credentials, date: new Date() });
    return new Promise<number>((resolve, reject) => {
      const outgoing = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, { method, headers }, response => {
        response.resume(); response.on("end", () => resolve(response.statusCode ?? 0));
      });
      outgoing.on("error", reject);
      outgoing.end(body);
    });
  };
}

function server(endpoint: string, credentials: SigningCredentials, close: () => Promise<void>): S3Server {
  const send = sender(endpoint, credentials);
  return Object.freeze({ endpoint, credentials, send, close,
    async createBucket() {
      const bucket = `desert-contract-${randomBytes(6).toString("hex")}`;
      const status = await send("PUT", `/${bucket}`, new Uint8Array(0),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
      if (status !== 200) throw new Error(`S3_SERVER_FAILED: CreateBucket answered ${status}`);
      return bucket;
    } });
}

const config = (secret: string) => `metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "${secret}"

[s3_api]
s3_region = "${s3ServerRegion}"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"
`;

async function until<T>(attempt: () => Promise<T>, what: string, deadline = Date.now() + 60_000): Promise<T> {
  for (;;) {
    try { return await attempt(); } catch (error) {
      if (Date.now() > deadline) throw new Error(`S3_SERVER_FAILED: ${what}`, { cause: error });
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
}

/** Starts Garage in a container and gives one key the right to create buckets. Removes the container on any failure. */
async function startContainer(): Promise<S3Server> {
  const name = `desert-s3-contract-${process.pid}-${randomBytes(4).toString("hex")}`;
  const directory = await mkdtemp(join(tmpdir(), "desert-s3-"));
  const remove = async () => {
    await docker("rm", "-f", "-v", name).catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  };
  try {
    await writeFile(join(directory, "garage.toml"), config(randomBytes(32).toString("hex")), { mode: 0o644 });
    await docker("run", "-d", "--name", name, ...limits, "--label", "desert.test=s3-contract", "-p", "127.0.0.1::3900",
      "--tmpfs", "/var/lib/garage", "-v", `${join(directory, "garage.toml")}:/etc/garage.toml:ro`, s3ServerImage);
    const garage = (...args: string[]) => docker("exec", name, "/garage", ...args);
    const node = await until(() => garage("node", "id", "-q"), "the server never answered its status");
    await garage("layout", "assign", "-z", "dc1", "-c", "1G", node.split("@")[0]!);
    await garage("layout", "apply", "--version", "1");
    const credentials = { accessKeyId: `GK${randomBytes(12).toString("hex")}`, secretAccessKey: randomBytes(32).toString("hex") };
    await garage("key", "import", "--yes", "-n", "desert-contract", credentials.accessKeyId, credentials.secretAccessKey);
    await garage("key", "allow", "--create-bucket", credentials.accessKeyId);
    const published = (await docker("port", name, "3900/tcp")).split("\n")[0]!;
    const started = server(`http://${published.replace("0.0.0.0", "127.0.0.1")}`, credentials, remove);
    await until(() => started.createBucket(), "the S3 API never accepted a bucket");
    return started;
  } catch (error) { await remove(); throw error; }
}

/** The server for this run, or why there is none. */
export async function s3Server(): Promise<S3Server | string> {
  const endpoint = process.env.DESERT_TEST_S3_ENDPOINT, accessKeyId = process.env.DESERT_TEST_S3_ACCESS_KEY;
  const secretAccessKey = process.env.DESERT_TEST_S3_SECRET_KEY;
  if (endpoint && accessKeyId && secretAccessKey) return server(endpoint, { accessKeyId, secretAccessKey }, async () => {});
  try { await docker("image", "inspect", "--format", "{{.Id}}", s3ServerImage); } catch {
    return `REQUIRES SERVICE: an S3-compatible server. Docker with the image ${s3ServerImage} ` +
      "(node tests/fixtures/s3-server.ts --pull), or DESERT_TEST_S3_ENDPOINT, DESERT_TEST_S3_ACCESS_KEY and DESERT_TEST_S3_SECRET_KEY.";
  }
  return startContainer();
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "--pull") {
  await run("docker", ["pull", s3ServerImage], { timeout: 600_000 });
}
