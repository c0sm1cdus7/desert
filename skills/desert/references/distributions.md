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

## src/build/index.ts

Source SHA-256: 030665363ec7a30c8c5aed116513ff7aa63225ebf32aee53de204ea8633616b5

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
}) {
  const resolved = resolveBuild(application, options.distributions, options.target);
  const { builder, plan } = installedBuilder(resolved.plan);
  const prepared = await builder.prepare(application, plan);
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

Source SHA-256: f3e7ca0d5c91571b99f0a7b77770175967b342b6c64630022512e2d5c0f260a2

```svelte
<script lang="ts">
  import HumanProduct from "@desert/svelte/HumanProduct.svelte";
  import { surface, validateInput } from "virtual:desert/surface";
</script>

<HumanProduct {surface} {validateInput} />
```
