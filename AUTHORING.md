# DESERT authoring bundle

Start here. This bundle pairs the real SDK source with its skill, complete Notebook,
derived API/reference snapshots, support status and independent tests. It is not
a public npm release, a complete TPA implementation or an instruction to migrate Kenon.

## Verify before working

Use Node 24 (tested 24.16.0, pinned in .nvmrc). From this directory:

```sh
node scripts/authoring-bundle.ts --verify
npm ci --ignore-scripts
npm run authoring:check
npm run typecheck
npm run inspect
```

The first command requires only Node and verifies the distributed source inventory
against AUTHORING-MANIFEST.json. The content digest identifies this exact tree;
it is not a signature or proof of origin. SDK package version and skill version
alone do not identify an exact source revision. Do not edit the supplied snapshot
and continue describing it as the same bundle; work in a separate copy for changes.
The manifest is present in exported bundles, not the working source checkout.

Dependency installation needs network access or a populated npm cache. The bundle
does not include node_modules, credentials, installed databases or browser binaries.
There is no supported npm install desert instruction for this private source SDK.

## Read in this order

1. [Skill](skills/desert/SKILL.md), including its version and reference routing.
   When updating, read the [changelog](skills/desert/CHANGELOG.md) and
   [update protocol](skills/desert/references/updating.md) first.
2. [Authoring](skills/desert/references/authoring.md) and
   [complete Notebook](skills/desert/references/notebook.md).
3. [Supported behavior](skills/desert/references/support.md), then the relevant
   [API source](skills/desert/references/api.md).
4. [Runtime](skills/desert/references/runtime.md) before executing;
   [verification](skills/desert/references/verification.md) before claiming support.
5. [Capability gaps](skills/desert/references/gaps.md) when the product exceeds support.

An agent can read this skill by its path; no global installation is required. If
installing into an agent-specific skill directory later, copy the whole skill folder,
not just SKILL.md. The references remain readable there, but execution still requires
this matching source bundle. No global install is performed by these commands.

### Claude Code: project-local installation

After verifying the new bundle, copy its entire `skills/desert` directory to
`<your-project>/.claude/skills/desert`, including all references. Do not overwrite an
existing skill blindly: compare and preserve its current revision first. Invoke
`/desert` and ask Claude to report the version from SKILL.md, the source bundle
path and its verified content digest. If discovery fails, read SKILL.md by its exact
path instead of assuming installation succeeded. See
[Claude Code's official skill documentation](https://code.claude.com/docs/en/skills).

Keep the verified bundle immutable and implement in a fresh working copy. Carry
forward product additions deliberately; do not overlay an old SDK or reset an
existing store. Installing instructions does not upgrade executable code. No
personal/global installation or changes to another agent's checkout are performed
by this handoff.

## Run the complete specimen

Typecheck and inspect need Node and installed dependencies. Real controller tests
also need PostgreSQL tools: tested version 18.6 on macOS. Put pg_config on PATH or
set DESERT_PG_BIN to the directory containing initdb and pg_ctl. Do not run as root.
Tests create temporary Unix-socket clusters, never connect to your existing database.
Linux host compatibility is not verified; Windows/native runtimes are not supplied.

```sh
npm run check
npm run web:check
npm run web:build
npm run test:web
```

Browser tests require compatible Playwright Chromium. If absent, installing it with
`npx playwright install chromium` downloads a browser and requires network/disk space.
They use the production Svelte build, not a mocked controller. Generated screenshots
land in artifacts/; that directory is intentionally not part of the delivered bundle.
The distribution build refuses an existing destination. Read
[distribution builds](docs/DISTRIBUTION-BUILDS.md) for rebuilding to a fresh path,
testing that exact artifact and mounting it against a matching local session.
The shared renderer template now belongs to the SDK, not a separate Notebook app.

Read [the checkout-race correction and evidence](docs/EVIDENCE-009.md) and
[complete Notebook journey coverage](docs/JOURNEY-TESTS.md). The root suite now
has a 30-second per-test bound. `npm run test:journeys` runs the product matrix;
`npm run test:recovery` runs the lifecycle and recovery group. A retry is not a fix.

For an interactive demonstration, run `npm run notebook:web` only when local port
4271 is available. Do not kill another Notebook to free the port. The fresh bundle
creates its own .local/notebook store. Open the single-use URL in its private
.local/notebook/web-launch.json, which must not be shared. Ctrl-C closes the host
and preserves that store. A changed contract must not silently repin or reset it.
Existing author-machine notes and credentials are not included in this bundle.

Notebook creates from its form, reads through an object context and archives through
Actions with review. Neither commit mode skips controller acceptance or authority.
Draft retention is mounted-session memory, not persistence across reloads.

## Reformulating a larger product

Keep approved intent, executable subset and missing capabilities separate. Do not
rename a requirement away to make it fit this specimen. Read the gap reference and
provide proposed semantics, enforcement and observable tests, not invented APIs.
Do not build custom handlers around an unsupported contract and call it DESERT support.

For Kenon, specifically distinguish review UX from consent authority and atomic
acceptance; policy declarations from enforced operation scope; state enums from
transitions; CLI/MCP invocation from external-effect semantics. The SDK has no
general role policy, approval gate, semantic object references, external effects or
internal scheduler yet. These are capability proposals, not undocumented constructors.

This bundle includes corrected multi-object controller authoring and the PostgreSQL
checkout correction. Read docs/EVIDENCE-010.md and docs/EVIDENCE-009.md respectively.
One controller owning multiple objects does not imply multi-object command effects.
All newly proposed roles, consent, scheduler, external-effect and isolation APIs
remain unapproved and unimplemented.

The latest skill changes and upgrade requirements are in
skills/desert/CHANGELOG.md. General contract-derived local verification is now
available through `src/testing/index.ts`; read docs/DERIVED-VERIFICATION.md and
the generated skill reference `references/testing.md`. Run `npm run verify:derived`
to exercise Notebook through the same runner used for the two-object product.
The older `verify:notebook` command remains a separate historical regression
matrix, not the implementation of the general verifier. Neither certifies UI,
MCP transport or all possible behavior.

## Maintain this package

`npm run authoring:generate` regenerates reference snapshots from source and canonical
support/runtime docs. `npm run authoring:check` detects drift. The bundle script
exports only source/doc/test roots, refuses an existing destination and excludes
runtime data, hidden files, build output and dependencies. Do not edit generated
references or archive private runtime files manually.

This package fixes delivery/authoring gaps; it does not approve new product policy
or change SDK execution semantics. No publication or production authority is implied.
