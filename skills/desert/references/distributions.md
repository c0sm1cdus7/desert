# Building supported distributions

Generated from the bundled SDK documentation; do not edit this snapshot.

## Source: docs/DISTRIBUTION-BUILDS.md

Source SHA-256: f876e85bc892cca5ebbafa463825dcfdfcaa07510b906837c6f5a2dbfc2d2a13

# Distribution builds

The product owns behavior. A surface declares exposure and interaction. A
distribution chooses a renderer and dependency bindings. Planning these definitions
does not build software: `planDistributions` still returns `unbuilt` plans.

`buildDistribution` is the separate build entrypoint. It resolves a validated plan
against installed SDK builders. The first installed builder is `svelte-web`;
controller, CLI and native targets fail with `BUILDER_NOT_INSTALLED`. This is a
general target-selection boundary, not a claim that every target is implemented.

## Author and build

The executable call lives in `products/notebook/build-web.ts`:

```ts
const manifest = await buildDistribution(compile(Notebook), {
  distributions: [NotebookService, NotebookWeb],
  target: NotebookWeb.id,
  outputDirectory: "build/notebook-web",
});
```

Import compilation from `src/index.ts` and building from `src/build/index.ts`.
The author supplies canonical definitions and a new output directory, not a second
page, validator, CRUD handler or a builder callback containing product behavior.
DESERT supplies the SvelteKit project template, shared components and generated
surface/validators. The renderer consumes the surface projection, not private policies.

The current renderer remains English, single-object and text-input-only, with the
existing read context, create action and subject actions. Unsupported compositions
or primitives fail before publication. This increment does not expand that vocabulary.
The generic template is under `src/build/svelte/template`; there is no separate
Notebook-owned Svelte application to keep in sync.

## What is produced

The output contains a real SvelteKit adapter-node build in `web/`, a module marker,
and `DESERT-BUILD.json`. The manifest binds:

- exact product contract and surface projection;
- target distribution and complete supplied distribution definitions;
- renderer source, lockfile and Node revision;
- the expected controller role/service binding;
- hashes of all delivered regular files.

The source/lockfile fingerprint is conservative, not a measured dependency-tree
attestation. Artifacts are not promised byte-reproducible across builds. The manifest
detects accidental changes; it is neither a signature nor proof of origin or safety
against a party who can replace both files and manifest. Use only trusted builds.
Build completion is not journey conformance, deployment, authentication or availability.

Builds use owned temporary workspaces, refuse existing destinations, reject symlinks,
and verify output before returning `status: "built"`. A caught failure removes only
the newly owned output. A process crash can leave an incomplete directory: it must
not be mounted unless verification succeeds. Choose a fresh destination on retry.

## Bind to a real local controller

```ts
const server = await serveBuiltLocalSurface({
  buildDirectory: "build/notebook-web",
  session,
  port: 0,
});
```

Import from `src/build/serve.ts`. `session` must be a genuine session returned by
`openLocalController(...).connect(...)`. Before importing the built handler, the
mount verifies all files and matches product, surface, renderer and role against
that session's trusted compiled application. Copied session objects are rejected.
It serves a private verified copy, so later edits of the original build directory
cannot alter already-mounted lazy assets. Only public client files and the root
page reach the renderer; internal build/server files and unknown routes return 404.

This builder supports one controller dependency, bound as a remote service from the
browser's perspective and supplied by the existing same-origin local HTTP gateway.
The controller and its database run locally: no Internet connection is required.
There is no new deployment resolver, remote-controller client or browser-local store.
The referenced service definition is checked for compatibility but is not itself
built; serving a human surface does not certify any declared agent endpoint.

Live availability and every operation still use the existing identity, installation,
admission and acceptance checks. A valid build cannot authorize a write. Close the
returned server to remove its private snapshot. Source and database administrators
remain trusted; this is not isolation from the same OS user.

## Run and verify

```sh
npm run web:check
npm run web:build
npm run test:web
```

Use Node 24 and the prerequisites in `AUTHORING.md`. `web:build` defaults to
`build/notebook-web` and refuses overwriting it. To build another revision:

```sh
npm run web:build -- build/notebook-web-next
DESERT_WEB_BUILD=build/notebook-web-next npm run test:web
npm run notebook:web -- build/notebook-web-next
```

The interactive runner still requires port 4271 to be free. Do not stop another
user's host or repin a persistent store. Tests use temporary stores and ephemeral
ports; the renamed-product browser test builds a second product through this same
entrypoint and proves that a contract-only review change controls actual acceptance.

See `tests/distribution-build.test.ts`, `tests/web/distribution.test.ts` and
`EVIDENCE-013.md`. Neither these tests nor the build manifest certify MCP, native
parity, offline browser installation, all visual states or complete TPA conformance.

# Distribution build entrypoints

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- src/build/index.ts
- src/build/serve.ts
- src/build/manifest.ts
- src/build/svelte/template/src/routes/+page.svelte
- src/local/developer-host.ts
- src/local/developer-identity.ts

## src/build/index.ts

Source SHA-256: 47bb0cf0fb76f63d30357fb17ee61a525ab5a6a56580a9aad12158045daa9ba9

```ts
import { mkdirSync, mkdtempSync, cpSync, rmSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { resolveBuild, type Application } from "./plan.ts";
import { installedBuilder } from "./builders.ts";
import { digest, fileInventory } from "./files.ts";
import { loadVerifiedBuild, manifestFile, type BuildManifest } from "./manifest.ts";

export { loadVerifiedBuild } from "./manifest.ts";
export async function buildDistribution(application: Application, options: {
  distributions: unknown, target: string, outputDirectory: string,
  viewProgram?: unknown,
}) {
  const resolved = resolveBuild(application, options.distributions, options.target);
  const { builder, plan } = installedBuilder(resolved.plan);
  const prepared = await builder.prepare(application, plan, options.viewProgram);
  const output = resolve(options.outputDirectory);
  try { lstatSync(output); throw new Error("BUILD_DESTINATION_EXISTS"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  mkdirSync(dirname(output), { recursive: true });
  const stage = mkdtempSync(join(dirname(output), ".desert-stage-"));
  const before = builder.revision();
  let ownsOutput = false;
  try {
    await prepared.build(stage);
    if (builder.revision() !== before) throw new Error("BUILDER_CHANGED_DURING_BUILD");
    const manifest: BuildManifest = {
      format: "desert.distribution-build/1", status: "built", productId: application.id,
      contractDigest: application.digest, distributionId: plan.id,
      distributionDigest: digest({ target: plan.id, distributions: resolved.definitions }),
      distributions: resolved.definitions, surfaceId: plan.surface, surfaceDigest: digest(plan.interaction),
      renderer: { id: builder.id, revision: before }, connection: prepared.connection,
      files: fileInventory(stage),
    };
    writeFileSync(join(stage, manifestFile), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    loadVerifiedBuild(stage);
    mkdirSync(output);
    ownsOutput = true;
    cpSync(stage, output, { recursive: true, errorOnExist: true, force: false });
    return loadVerifiedBuild(output);
  } catch (error) {
    if (ownsOutput) rmSync(output, { recursive: true });
    throw error;
  } finally { rmSync(stage, { recursive: true }); }
}
```

## src/build/serve.ts

Source SHA-256: 36f743bd971929bb66f6ee1797870aed88ee5414da581dcbd55013a5fb85ec80

```ts
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { RequestListener } from "node:http";
import type { LocalSession } from "../local.ts";
import { serveLocalSurface } from "../web/server.ts";
import { snapshotBuild } from "./snapshot.ts";
import { requireBuildSession } from "./session.ts";
import { publicHandler } from "./public-handler.ts";

export async function serveBuiltLocalSurface(options: {
  buildDirectory: string, session: LocalSession, port?: number,
}) {
  const snapshot = snapshotBuild(options.buildDirectory);
  try {
    requireBuildSession(snapshot.manifest, options.session);
    const loaded = await import(pathToFileURL(join(snapshot.directory, "web/handler.js")).href);
    if (typeof loaded.handler !== "function") throw new Error("INVALID_WEB_HANDLER");
    const server = await serveLocalSurface(options.session, snapshot.manifest.contractDigest,
      publicHandler(snapshot.manifest, loaded.handler as RequestListener), options.port ?? 4271);
    return { origin: server.origin, launchUrl: server.launchUrl,
      async close() { try { await server.close(); } finally { snapshot.close(); } },
    };
  } catch (error) { snapshot.close(); throw error; }
}
```

## src/build/manifest.ts

Source SHA-256: 2d264d63d45aa7a41ff68c87e85a528419a0c46e5ea49b7645fb3f37bc3dd11b

```ts
import { Type, type Static } from "@sinclair/typebox";
import { DistributionSchema } from "../distributions.ts";
import { createSchemaValidator } from "../validation.ts";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileInventory, digest } from "./files.ts";

export const manifestFile = "DESERT-BUILD.json";
const name = Type.String({ minLength: 1 });
const sha = Type.String({ pattern: "^[a-f0-9]{64}$" });
const closed = { additionalProperties: false };
const ManifestSchema = Type.Object({
  format: Type.Literal("desert.distribution-build/1"), status: Type.Literal("built"),
  productId: name, contractDigest: sha, distributionId: name, distributionDigest: sha,
  distributions: Type.Array(DistributionSchema), surfaceId: name, surfaceDigest: sha,
  renderer: Type.Object({ id: name, revision: sha }, closed),
  connection: Type.Object({ kind: Type.Literal("local-http-session"), role: name, service: name }, closed),
  files: Type.Record(Type.String(), sha),
}, closed);
export type BuildManifest = Static<typeof ManifestSchema>;
const validManifest = createSchemaValidator<BuildManifest>(ManifestSchema);

export function loadVerifiedBuild(directory: string) {
  const files = fileInventory(directory, [manifestFile]);
  const manifest = jsonSnapshot(JSON.parse(readFileSync(join(directory, manifestFile), "utf8")));
  if (!validManifest(manifest)) throw new Error("INVALID_BUILD_MANIFEST");
  if (digest(files) !== digest(manifest.files)) throw new Error("BUILD_FILES_MISMATCH");
  if (manifest.distributionDigest !== digest({ target: manifest.distributionId, distributions: manifest.distributions })) {
    throw new Error("DISTRIBUTION_DIGEST_MISMATCH");
  }
  return freezeDeep(manifest);
}
```

## src/build/svelte/template/src/routes/+page.svelte

Source SHA-256: 1fa3b0f098ffb0d2a538268465800a1a1b5822f21026b09f3138e8f99ad5e123

```svelte
<script lang="ts">
  import HumanProduct from "@desert/svelte/HumanProduct.svelte";
  import ViewProduct from "@desert/svelte/views/ViewProduct.svelte";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

{#if viewProgram}
  <ViewProduct program={viewProgram} {surface} {validateInput} />
{:else}
  <HumanProduct {surface} {validateInput} />
{/if}
```

## src/local/developer-host.ts

Source SHA-256: 1eb8a2ab41aa40b088c7a5db1096f37dfee79d7b744f6ac08b89ad976d0d4f06

```ts
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { compile } from "../compile.ts";
import { serveBuiltLocalSurface } from "../build/serve.ts";
import { openLocalController } from "./controller.ts";
import { startLocalPostgres } from "./postgres-host.ts";
import { developerIdentity, writePrivateJson } from "./developer-identity.ts";

export type DeveloperHostOptions = {
  application: ReturnType<typeof compile>;
  role: string;
  surfaceId: string;
  directory: string;
};

/** Trusted developer bootstrap, not production login, enrollment or recovery. */
export async function openDeveloperHost(options: DeveloperHostOptions) {
  options.application.surface(options.surfaceId);
  const initialize = !existsSync(join(options.directory, "postgres"));
  const postgres = startLocalPostgres(options.directory);
  let controller: Awaited<ReturnType<typeof openLocalController>> | undefined;
  let closing: Promise<void> | undefined;
  function close() {
    return closing ??= (async () => {
      try { await controller?.close(); } finally { postgres.stop(); }
    })();
  }
  try {
    controller = await openLocalController(options.application, { ...postgres.database, role: options.role });
    const identity = await developerIdentity(controller, options.directory, initialize);
    const session = controller.connect(identity.token, options.surfaceId);
    return Object.freeze({ application: options.application, session, close });
  } catch (error) { await close(); throw error; }
}

/** Serves only loopback; the one-use launch invitation stays in a private file. */
export async function serveDeveloperSurface(options: DeveloperHostOptions & {
  buildDirectory: string;
  port?: number;
}) {
  if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535)) {
    throw new Error("INVALID_LOCAL_PORT");
  }
  const host = await openDeveloperHost(options);
  let server: Awaited<ReturnType<typeof serveBuiltLocalSurface>> | undefined;
  let closing: Promise<void> | undefined;
  function close() {
    return closing ??= (async () => {
      try { await server?.close(); } finally { await host.close(); }
    })();
  }
  try {
    server = await serveBuiltLocalSurface({ buildDirectory: options.buildDirectory, session: host.session, port: options.port ?? 0 });
    const launchFile = join(options.directory, "web-launch.json");
    writePrivateJson(launchFile, { url: server.launchUrl });
    return Object.freeze({ origin: server.origin, launchFile, close });
  } catch (error) { await close(); throw error; }
}
```

## src/local/developer-identity.ts

Source SHA-256: 7b97ea5da332e44d3f1e8056f15be11251282211f755269784b88a9efde7b354

```ts
import { constants, closeSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { openLocalController } from "../local.ts";
import { requirePrivatePath } from "./postgres-host.ts";

type Controller = Awaited<ReturnType<typeof openLocalController>>;
type Credential = { id: string; token: string };

function privateFileExists(path: string) {
  try { requirePrivatePath(path, false); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function writePrivateJson(path: string, value: unknown, exclusive = false) {
  privateFileExists(path);
  const file = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW |
    (exclusive ? constants.O_EXCL : constants.O_TRUNC), 0o600);
  try { writeFileSync(file, JSON.stringify(value) + "\n"); }
  finally { closeSync(file); }
}

export async function developerIdentity(controller: Controller, directory: string, initialize: boolean): Promise<Credential> {
  const path = join(directory, "identity.json");
  if (!privateFileExists(path)) {
    if (!initialize) throw new Error("LOCAL_CREDENTIAL_MISSING");
    const identity = await controller.identities.issue("Local developer");
    writePrivateJson(path, identity, true);
    return identity;
  }
  let identity: unknown;
  try { identity = JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new Error("INVALID_LOCAL_CREDENTIAL"); }
  if (!identity || typeof identity !== "object" || Array.isArray(identity) ||
    Object.keys(identity).sort().join() !== "id,token" ||
    !("id" in identity) || typeof identity.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.id) ||
    !("token" in identity) || typeof identity.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(identity.token)) {
    throw new Error("INVALID_LOCAL_CREDENTIAL");
  }
  // Valid shape is not authority. Session operations recheck the retained token;
  // expiry or revocation must never create another identity and orphan its notes.
  return { id: identity.id, token: identity.token };
}
```
