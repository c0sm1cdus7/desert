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
