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
