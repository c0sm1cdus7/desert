# Building supported distributions

Generated from the bundled SDK documentation; do not edit this snapshot.

## Source: docs/DISTRIBUTION-BUILDS.md

Source SHA-256: bbb91e2c43870ca86e04f41fb12419604581e91e6f323665c6673984830d00d1

# Distribution builds

The product owns behavior and its composed View program. A surface declares exposure. A
distribution chooses a renderer and dependency bindings. Planning these definitions
does not build software: `planDistributions` still returns `unbuilt` plans.

`buildDistribution` is the separate build entrypoint. It resolves a validated plan
against installed SDK builders. The first installed builder is `svelte-web`;
controller, CLI and native targets fail with `BUILDER_NOT_INSTALLED`. This is a
general target-selection boundary, not a claim that every target is implemented.

## Author and build

The executable call lives in `products/notebook/build-web.ts`:

```ts
const manifest = await buildDistribution(compile(NotebookProduct), {
  distributions: [NotebookService, NotebookWeb],
  target: NotebookWeb.id,
  outputDirectory: "build/notebook-web",
});
```

Import compilation from `src/index.ts` and building from `src/build/index.ts`.
`NotebookProduct` is the issued composition exported by `products/notebook/product.ts`.
The author supplies canonical definitions and a new output directory, not a second
page, validator, CRUD handler or a builder callback containing product behavior.
DESERT supplies the SvelteKit project template, shared components and generated
surface/validators. The builder obtains the View program from the compiled application;
there is no `viewProgram` override. The renderer consumes the admitted program and
surface projection, not private policies.

The current English renderer consumes a finite vocabulary, including multiple read
contexts, typed forms, object actions, media and conditional activities. Unsupported
compositions or primitives fail admission; this is not a general HTML/CSS authoring API.
The generic template is under `src/build/svelte/template`; there is no separate
Notebook-owned Svelte application to keep in sync.

## What is produced

The output contains a real SvelteKit adapter-node build in `web/`, a module marker,
and `DESERT-BUILD.json`. The manifest binds:

- exact product contract, surface projection and admitted View program;
- target distribution and complete supplied distribution definitions;
- renderer source, lockfile and Node revision;
- the expected controller roles/service binding and admitted activity catalog;
- hashes of all delivered regular files.

The source/lockfile fingerprint is conservative, not a measured dependency-tree
attestation. Artifacts are not promised byte-reproducible across builds. The manifest
detects accidental changes; it is neither a signature nor proof of origin or safety
against a party who can replace both files and manifest. Use only trusted builds.
Build completion is not journey conformance, deployment, authentication or availability.

The current manifest format is `desert.distribution-build/3`. Its required
`viewProgramDigest` prevents mounting a stale workspace, navigation or view layout
against a different composition that happens to have identical data contracts.
Older manifests require a new build; the host does not infer or accept a missing
program binding.

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
mount verifies all files and matches product, surface, View program, renderer and roles against
that session's trusted compiled application. Copied session objects are rejected.
It serves a private verified copy, so later edits of the original build directory
cannot alter already-mounted lazy assets. Only public client files and the root
page reach the renderer; internal build/server files and unknown routes return 404.

This builder supports a set of controller roles supplied by one compatible service,
bound as remote dependencies from the browser's perspective and supplied by the
existing same-origin local HTTP gateway.
The controller and its database run locally: no Internet connection is required.
There is no new deployment resolver, remote-controller client or browser-local store.
The referenced service definition is checked for compatibility but is not itself
built; serving a human surface does not certify any declared agent endpoint.

Live availability and every operation still use the existing identity, installation,
admission and acceptance checks. A valid build cannot authorize a write. Close the
returned server to remove its private snapshot. Source and database administrators
remain trusted; this is not isolation from the same OS user.

## Run and verify

### External local reference media

A validated View program may contain a read-only `media-library` composition.
Pass `media: { sourceRoot, assets }` to both `buildDistribution` and
`serveBuiltLocalSurface` (or `serveDeveloperSurface`). Assets use the existing
logical `{ id, path, alt }` binding; the path is relative to the supplied root.
Every declared external image needs an exact binding, and unused bindings fail.
The shared built-in inspection illustration does not need an external binding.

The generated `LOCAL-MEDIA.json` is covered by the build inventory and contains
IDs, digests, sizes and MIME types only. Photographs and local paths are not
bundled. Mounting verifies the binding and snapshots bytes and optimized renditions;
missing or changed sources fail instead of displaying unrelated images. `/media/`
serves only declared assets and supported rendition widths, not directories.

This is a trusted loopback reference-media mechanism. It does not authorize private
uploads, provide a persistent media service, or grant redistribution rights. The
reference assets must be available separately to run that local build.

### Commands

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
- src/build/media.ts
- src/build/media-handler.ts
- src/build/media-references.ts
- src/build/svelte/template/src/routes/+page.svelte
- src/local/developer-host.ts
- src/local/developer-identity.ts

## src/build/index.ts

Source SHA-256: a4e5c4cb750999159d307cdd789bdfd2d6cf5e9008fa418918d29b67e7a1cc52

```ts
import { mkdirSync, mkdtempSync, cpSync, rmSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { resolveBuild, type Application } from "./plan.ts";
import { installedBuilder } from "./builders.ts";
import { digest, fileInventory } from "./files.ts";
import { loadVerifiedBuild, manifestFile, type BuildManifest } from "./manifest.ts";
import { bindLocalMedia, writeLocalMedia, requireDistinctMedia, type LocalMediaBinding } from "./media.ts";
import { prepareRenditions } from "./public-catalog/renditions.ts";
import { compileViewProgram } from "../views/program.ts";
import { requireViewMediaBindings } from "./media-references.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { productViewProgram } from "../modules/compiled-product.ts";

export { loadVerifiedBuild } from "./manifest.ts";
export type { LocalMediaBinding } from "./media.ts";
export async function buildDistribution(application: Application, options: {
  distributions: unknown, target: string, outputDirectory: string,
  media?: LocalMediaBinding,
}) {
  if (Object.hasOwn(options, "viewProgram")) throw new Error("VIEW_PROGRAM_OVERRIDE_FORBIDDEN");
  const resolved = resolveBuild(application, options.distributions, options.target);
  const { builder, plan } = installedBuilder(resolved.plan);
  const viewProgram = compileViewProgram(productViewProgram(application), plan.interaction);
  const activities = viewProgramActivities(application, viewProgram, plan.surface);
  const media = options.media ? bindLocalMedia(options.media) : undefined;
  requireViewMediaBindings(viewProgram, media ?? []);
  const prepared = await builder.prepare(application, plan);
  if (media) await prepareRenditions(media);
  const output = resolve(options.outputDirectory);
  try { lstatSync(output); throw new Error("BUILD_DESTINATION_EXISTS"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  mkdirSync(dirname(output), { recursive: true });
  const stage = mkdtempSync(join(dirname(output), ".desert-stage-"));
  const before = builder.revision();
  let ownsOutput = false;
  try {
    await prepared.build(stage);
    if (media) { requireDistinctMedia(media, fileInventory(stage)); writeLocalMedia(stage, media); }
    if (builder.revision() !== before) throw new Error("BUILDER_CHANGED_DURING_BUILD");
    const manifest: BuildManifest = {
      format: "desert.distribution-build/3", status: "built", productId: application.id,
      contractDigest: application.digest, distributionId: plan.id,
      distributionDigest: digest({ target: plan.id, distributions: resolved.definitions }),
      distributions: resolved.definitions, surfaceId: plan.surface, surfaceDigest: digest(plan.interaction),
      viewProgramDigest: digest(viewProgram),
      ...(activities ? { activitiesDigest: activities.digest } : {}),
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

Source SHA-256: f32ca59d73c2500f87bdd3c666b49286358e8b02c1cbf44f625331c49f20f854

```ts
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { RequestListener } from "node:http";
import type { LocalSession } from "../local.ts";
import { serveLocalSurface, serveIdentitySurface } from "../web/server.ts";
import { snapshotBuild } from "./snapshot.ts";
import { requireBuildSession, requireBuildController } from "./session.ts";
import { publicHandler } from "./public-handler.ts";
import { localMediaHandler } from "./media-handler.ts";
import type { LocalMediaBinding } from "./media.ts";
import type { LocalController } from "../local/controller.ts";
import type { loadVerifiedBuild } from "./manifest.ts";

type BuildOptions = { buildDirectory: string; port?: number; media?: LocalMediaBinding };

export async function serveBuiltLocalSurface(options: BuildOptions & { session: LocalSession }) {
  return serveBuiltSurface(options, manifest => requireBuildSession(manifest, options.session),
    (render, digest) => serveLocalSurface(options.session, digest, render, options.port ?? 4271));
}
export async function serveBuiltIdentitySurface(options: BuildOptions & { controller: LocalController; surface: string }) {
  return serveBuiltSurface(options, manifest => requireBuildController(manifest, options.controller, options.surface),
    render => serveIdentitySurface(options.controller, options.surface, render, options.port ?? 4271));
}
async function serveBuiltSurface(options: BuildOptions, verify: (manifest: ReturnType<typeof loadVerifiedBuild>) => unknown,
  serve: (render: RequestListener, digest: string) => ReturnType<typeof serveLocalSurface>) {
  const snapshot = snapshotBuild(options.buildDirectory);
  let media: Awaited<ReturnType<typeof localMediaHandler>> | undefined;
  try {
    verify(snapshot.manifest);
    const loaded = await import(pathToFileURL(join(snapshot.directory, "web/handler.js")).href);
    if (typeof loaded.handler !== "function") throw new Error("INVALID_WEB_HANDLER");
    media = await localMediaHandler(snapshot.directory, snapshot.manifest.files, options.media,
      publicHandler(snapshot.manifest, loaded.handler as RequestListener));
    const server = await serve(media.handle, snapshot.manifest.contractDigest);
    return { origin: server.origin, launchUrl: server.launchUrl,
      async close() { try { await server.close(); } finally { media?.close(); snapshot.close(); } },
    };
  } catch (error) { media?.close(); snapshot.close(); throw error; }
}
```

## src/build/manifest.ts

Source SHA-256: d5da0c7ef92f37fcef84ba2fe30dffc6528aa711a193afa2f46c8a5c2370606a

```ts
import { Type, type Static } from "@sinclair/typebox";
import { DistributionSchema } from "../distributions.ts";
import { createSchemaValidator } from "../validation.ts";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileInventory, digest } from "./files.ts";
import { loadLocalMedia, localMediaFile, requireDistinctMedia } from "./media.ts";

export const manifestFile = "DESERT-BUILD.json";
const name = Type.String({ minLength: 1 });
const sha = Type.String({ pattern: "^[a-f0-9]{64}$" });
const closed = { additionalProperties: false };
const ManifestSchema = Type.Object({
  format: Type.Literal("desert.distribution-build/3"), status: Type.Literal("built"),
  productId: name, contractDigest: sha, distributionId: name, distributionDigest: sha,
  distributions: Type.Array(DistributionSchema), surfaceId: name, surfaceDigest: sha, viewProgramDigest: sha,
  activitiesDigest: Type.Optional(sha),
  renderer: Type.Object({ id: name, revision: sha }, closed),
  connection: Type.Object({ kind: Type.Literal("local-http-session"), roles: Type.Array(name, { minItems: 1, uniqueItems: true }), service: name }, closed),
  files: Type.Record(Type.String(), sha),
}, closed);
export type BuildManifest = Static<typeof ManifestSchema>;
const validManifest = createSchemaValidator<BuildManifest>(ManifestSchema);

export function loadVerifiedBuild(directory: string) {
  const files = fileInventory(directory, [manifestFile]);
  const manifest = jsonSnapshot(JSON.parse(readFileSync(join(directory, manifestFile), "utf8")));
  if (!validManifest(manifest)) throw new Error("INVALID_BUILD_MANIFEST");
  if (digest(files) !== digest(manifest.files)) throw new Error("BUILD_FILES_MISMATCH");
  if (Object.hasOwn(files, localMediaFile)) requireDistinctMedia(loadLocalMedia(directory).assets, files);
  if (manifest.distributionDigest !== digest({ target: manifest.distributionId, distributions: manifest.distributions })) {
    throw new Error("DISTRIBUTION_DIGEST_MISMATCH");
  }
  return freezeDeep(manifest);
}
```

## src/build/media.ts

Source SHA-256: b1347beb414df344c9b014ba6632d880433adf8c6bdf782c44f7d6094de1d249

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, type Frozen } from "../json.ts";
import { LogicalIdSchema } from "../public-catalog/node-schema.ts";
import { bindCatalogAssets, catalogMediaTypes, type CatalogAssetBinding, type BoundCatalogAsset } from "./public-catalog/assets.ts";

/** Explicit read-only local reference assets, not private uploads or an authorization mechanism. */
export type LocalMediaBinding = Readonly<{ sourceRoot: string; assets: readonly CatalogAssetBinding[] }>;
export const localMediaFile = "LOCAL-MEDIA.json";
const mediaTypes = [...new Set(Object.values(catalogMediaTypes))];
const schema = Type.Object({
  format: Type.Literal("desert.local-media/1"), policy: Type.Literal("external-local-reference"),
  assets: Type.Array(Type.Object({
    id: LogicalIdSchema, digest: Type.String({ pattern: "^[a-f0-9]{64}$" }),
    size: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    mediaType: Type.Union(mediaTypes.map(type => Type.Literal(type))),
  }, { additionalProperties: false }), { minItems: 1 }),
}, { additionalProperties: false });
export type LocalMediaAttestation = Frozen<Static<typeof schema>>;

export function bindLocalMedia(binding: LocalMediaBinding): readonly BoundCatalogAsset[] {
  const assets = bindCatalogAssets(binding.sourceRoot, binding.assets);
  if (assets.some(asset => !mediaTypes.includes(asset.mediaType))) throw new Error("UNSUPPORTED_LOCAL_MEDIA_TYPE");
  return Object.freeze([...assets].sort((a, b) => a.id.localeCompare(b.id, "en")));
}

export function mediaAttestation(assets: readonly BoundCatalogAsset[]): LocalMediaAttestation {
  const value = { format: "desert.local-media/1", policy: "external-local-reference",
    assets: assets.map(({ file: _file, ...metadata }) => metadata) };
  if (!Check(schema, value)) throw new Error("INVALID_LOCAL_MEDIA_ATTESTATION");
  return freezeDeep(value);
}

export function writeLocalMedia(directory: string, assets: readonly BoundCatalogAsset[]) {
  writeFileSync(join(directory, localMediaFile), JSON.stringify(mediaAttestation(assets), null, 2) + "\n", { flag: "wx" });
}

export function loadLocalMedia(directory: string): LocalMediaAttestation {
  const value: unknown = JSON.parse(readFileSync(join(directory, localMediaFile), "utf8"));
  if (!Check(schema, value) || new Set(value.assets.map(asset => asset.id)).size !== value.assets.length) {
    throw new Error("INVALID_LOCAL_MEDIA_ATTESTATION");
  }
  return freezeDeep(value);
}

export function requireDistinctMedia(assets: readonly { id: string }[], files: Readonly<Record<string, string>>) {
  if (assets.some(asset => Object.hasOwn(files, `web/client/media/${asset.id}`))) throw new Error("LOCAL_MEDIA_ASSET_COLLISION");
}
```

## src/build/media-handler.ts

Source SHA-256: 8b5be00a3f425449eb90b0f083bd28f50579947cdc4d9c3b0a2b38d954ca76bd

```ts
import type { RequestListener } from "node:http";
import { readFileSync } from "node:fs";
import { digest, hash } from "./files.ts";
import { bindLocalMedia, loadLocalMedia, localMediaFile, requireDistinctMedia, type LocalMediaBinding } from "./media.ts";
import { prepareRenditions, renditionWidths } from "./public-catalog/renditions.ts";
import { sendCatalogMedia } from "./public-catalog/media-response.ts";

/** Shares approved image delivery; no paths or arbitrary files are request-addressable. */
export async function localMediaHandler(directory: string, files: Readonly<Record<string, string>>,
  binding: LocalMediaBinding | undefined, render: RequestListener) {
  const declared = Object.hasOwn(files, localMediaFile);
  if (!declared && binding) throw new Error("UNDECLARED_LOCAL_MEDIA_BINDING");
  if (declared && !binding) throw new Error("LOCAL_MEDIA_BINDING_REQUIRED");
  if (!declared || !binding) return { handle: render, close() {} };
  const expected = loadLocalMedia(directory);
  const assets = bindLocalMedia(binding);
  const metadata = assets.map(({ file: _file, ...value }) => value);
  if (digest(metadata) !== digest(expected.assets)) throw new Error("LOCAL_MEDIA_MISMATCH");
  requireDistinctMedia(assets, files);
  const images = new Map(assets.map(asset => {
    const bytes = readFileSync(asset.file);
    if (hash(bytes) !== asset.digest) throw new Error("LOCAL_MEDIA_CHANGED");
    return [asset.id, { ...asset, bytes }] as const;
  }));
  const renditions = await prepareRenditions(assets);
  const handle: RequestListener = (request, response) => {
    let url: URL, path: string;
    try { url = new URL(request.url ?? "/", "http://127.0.0.1"); path = decodeURIComponent(url.pathname); }
    catch { response.writeHead(400); response.end(); return; }
    const asset = path.startsWith("/media/") ? images.get(path.slice(7)) : undefined;
    if (!asset) { render(request, response); return; }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    const widths = url.searchParams.getAll("w");
    if (widths.length > 1 || [...url.searchParams.keys()].some(key => key !== "w") ||
      (widths.length && !renditionWidths.map(String).includes(widths[0]!))) {
      response.writeHead(400); response.end(); return;
    }
    if (widths.length) {
      const rendition = renditions.get(`${asset.id}:${widths[0]}`);
      if (!rendition) { response.writeHead(404); response.end(); return; }
      sendCatalogMedia(request, response, rendition); return;
    }
    sendCatalogMedia(request, response, asset);
  };
  return { handle, close() { images.clear(); renditions.clear(); } };
}
```

## src/build/media-references.ts

Source SHA-256: ff9383491a1aa1e41acfbc50fde1d495fe5a3b51c8ab12b6749e25fba9a02b9d

```ts
import type { ViewProgram } from "../views/program-schema.ts";
import { inspectionMedia } from "../svelte/infra/inspection-media.ts";
import { viewHeaderImages } from "../views/header-media.ts";
import { mediaArtwork } from "../views/media-library.ts";

/** Closed asset projection from validated Views; the inspection sample is SDK-owned. */
export function requireViewMediaBindings(program: ViewProgram | undefined, assets: readonly { id: string; mediaType: string }[]) {
  const references = new Set<string>();
  const formats = new Map<string, Set<string>>();
  function require(id: string, format: string) {
    references.add(id);
    const allowed = formats.get(id) ?? new Set<string>();
    allowed.add(format); formats.set(id, allowed);
  }
  for (const view of program?.views ?? []) for (const item of view.content) {
    if (item.kind === "header" && item.media) {
      for (const image of viewHeaderImages(item.media)) require(image.asset, "image/");
    } else if (item.kind === "media-library") {
      for (const media of item.library.items) {
        const artwork = mediaArtwork(media);
        if (artwork) require(artwork.asset, "image/");
        if (media.kind !== "image") {
          require(media.source.asset, `${media.kind}/`);
          for (const caption of media.captions ?? []) require(caption.asset, "text/vtt");
        }
      }
    } else {
      const items = item.kind === "stack" ? item.items : [item];
      for (const leaf of items) {
        if ((leaf.kind === "image" || leaf.kind === "avatar") && leaf.source && typeof leaf.source === "object") {
          if (!("asset" in leaf.source)) throw new Error("VIEW_RUNTIME_ASSET_REFERENCE_REQUIRED");
          require(leaf.source.asset, "image/");
        }
      }
    }
  }
  references.delete(inspectionMedia.asset);
  const bound = new Set(assets.map(asset => asset.id));
  if ([...references].some(id => !bound.has(id))) throw new Error("VIEW_MEDIA_BINDING_REQUIRED");
  if ([...bound].some(id => !references.has(id))) throw new Error("UNREFERENCED_LOCAL_MEDIA_BINDING");
  for (const asset of assets) {
    if ([...formats.get(asset.id) ?? []].some(format => !asset.mediaType.startsWith(format))) {
      throw new Error("VIEW_MEDIA_KIND_MISMATCH");
    }
  }
}
```

## src/build/svelte/template/src/routes/+page.svelte

Source SHA-256: 8ceac8265236657fe8b46a343218e7f6cd05918e119120c35d1571a8dc7bb8ba

```svelte
<script lang="ts">
  import AccessGate from "@desert/svelte/catalog/compositions/access-gate/AccessGate.svelte";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

<AccessGate {surface} {validateInput} {viewProgram} />
```

## src/local/developer-host.ts

Source SHA-256: 11cd3dc81dbc7ef07ac094cae6b61063656017fe09afb67b5c5885e1b4e11efd

```ts
import { developerIdentity } from "./developer-identity.ts";
import { openControllerHost, serveControllerHost, type ControllerHostOptions, type HostedSurfaceOptions } from "./controller-host.ts";

export type DeveloperHostOptions = ControllerHostOptions;

/** Trusted developer bootstrap, not production login, enrollment or recovery. */
export async function openDeveloperHost(options: DeveloperHostOptions) {
  const host = await openControllerHost(options);
  try {
    const identity = await developerIdentity(host.controller, options.directory, host.initialize);
    const session = host.controller.connect(identity.token, options.surfaceId);
    return Object.freeze({ application: host.application, session, close: host.close });
  } catch (error) { await host.close(); throw error; }
}

/** Serves only loopback; the one-use launch invitation stays in a private file. */
export function serveDeveloperSurface(options: HostedSurfaceOptions) {
  return serveControllerHost(options, "developer");
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
