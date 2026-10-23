# Setup protected state and verification

## Snapshot status

This handoff preserves current source, tests, documentation and original sample
assets in two commits. It does not repair visual enforcement or certify the source.
The preparation ran repository/diff/link/safety checks, not product tests, a build,
or browser verification. Review historical evidence only with its original scope.
After staging previously untracked source, `git diff --cached --check` reported
pre-existing whitespace in six added files: `src/assets/policy.ts`,
`src/web/client/activity-state.ts`, `tests/appearance-preview.test.ts`,
`tests/fixtures/toolbar-before.ts`, `tests/fixtures/workspace-before-finite-content.ts`
and `tests/semantic-ownership-raw.test.ts`. The snapshot preserves that source
unchanged; this check is not reported as clean or as a functional test result.

The local walkthrough most recently used build `void-walkthrough-2026-10-22-a16`
on port 52307 with the existing a9 store. A separate protected preview uses port
4400. Those are local preservation references, not cloud addresses or guarantees
that a process is still running. Do not stop, replace or migrate either host/store.
Cloud work must use new isolated builds, identities and data directories.

## Obtain and pin the repository pair

Use the exact DESERT and VOID commit IDs supplied with the handoff. The repositories
are separate; checking out one latest branch and one old default is not reproduction.

```sh
git clone --branch codex/module-architecture https://github.com/c0sm1cdus7/desert.git
git clone --branch codex/module-architecture https://github.com/c0sm1cdus7/void.git
```

Verify each `git rev-parse HEAD` against the delivered pair before proceeding.
Create an external work branch from the pinned checkpoint for later approved
implementation. Do not force-push, merge into base branches, change visibility,
publish a package, or create cloud infrastructure as an implied setup step.

DESERT is private and VOID public. Missing DESERT access is a blocker to obtain
from the owner, not permission to duplicate its source in the public repository.
The sibling paths above satisfy `file:../desert` in VOID's lockfile/package.

## Runtime prerequisites

Both repositories pin Node **24.16.0** in `.nvmrc` and require Node >=24. Select
that exact version explicitly and print `node --version` and `npm --version`.
Different local shells have resolved different Node installations; never assume
the ambient `node` is the version used by historical evidence.

Source-checked entrypoints below are instructions for the external environment,
not claims that they were executed in this handoff operation:

```sh
cd desert
nvm install
nvm use
npm ci --ignore-scripts
npm run typecheck
npm test
cd ../void
nvm use
npm ci --ignore-scripts
npm run check
npm run inspect
```

Another version manager can provide the exact Node release; nvm itself is not
required. Record installation failures rather than changing pinned dependencies
silently. Install SDK dependencies before VOID's local linked dependency.

PostgreSQL must provide `initdb`, `pg_ctl` and `postgres`. The implementation uses
`pg_config --bindir` or `DESERT_PG_BIN` to discover the binary directory. Set the
latter only to the environment's actual PostgreSQL bin path, not a copied macOS
Homebrew path. Tests create temporary isolated clusters and Unix sockets; they do
not need production database credentials. **Run as a non-root OS user** because
PostgreSQL initdb refuses root. Linux/cloud qualification must be performed, not
inferred from past macOS results. Windows/native portability is not established.

## Fresh VOID web build and isolated tests

From the VOID repository, choose previously unused output/store paths:

```sh
npm run web:build -- build/external-enforcement-baseline
npm run dev -- build/external-enforcement-baseline .local/external-enforcement-baseline 0
```

The host arguments are build directory, store directory, then port; port 0 chooses
an available port. It prints the origin and path to a private launch file. Never
commit or paste that file's contents into a handoff. Create a new test identity;
there are no shared/default owner credentials. Never run two hosts on one store,
reset a user's store, or repin a contract after INSTALLATION_MISMATCH.

Install Chromium separately when required by the environment:

```sh
npx playwright install chromium
VOID_WEB_BUILD="$PWD/build/external-enforcement-baseline" npm run test:web
```

On Linux, installing browser OS dependencies requires appropriate setup authority;
it is not a read-only action. Browser fixtures use isolated data and write evidence
under ignored `.local/web-evidence/`. Report real timeouts/failures. Increasing a
wait threshold does not establish correctness or bypass the runner's test timeout.

## SDK browser suites and visual boundary commands

SDK browser families use separate artifacts and environment variables. Source
entrypoints include the following, from DESERT:

```sh
npm run web:build -- build/external-notebook
DESERT_INSPECTION_BUILD="$PWD/build/external-inspection" node tests/fixtures/build-inspection.ts
node products/landmarks/build-web.ts build/external-landmarks
```

Set `DESERT_WEB_BUILD`, `DESERT_INSPECTION_BUILD` and `DESERT_CATALOG_BUILD` to the
respective built Notebook, Inspection and Landmarks paths for applicable tests.
Do not assume all browser suites need only the VOID build. Some platform/lifecycle
checks require more setup; enumerate unexecuted cases explicitly.

```sh
node scripts/check-visual-boundary.ts --closed-boundaries
node scripts/check-visual-boundary.ts --no-new-debt
node scripts/check-visual-boundary.ts --check
```

The first is a partial migrated-boundary check. The second compares diagnostic
debt, not approval. The third currently rejects global qualification. **Do not use
`--write-audit` to make violations disappear into an accepted baseline.** A test
file named `tests/drafts/activity-host.test.ts.pending` is a preserved draft, not
an executed passing test or installed capability.

## Media and missing local references

Current VOID registers private-media overview/collection/item views. Its legacy
sample MediaView/LocalMediaLibrary files are not registered by media.module.ts.
`scripts/local-media.ts` returns no bundled-media configuration when the admitted
program has no `media-library` assets. Therefore the current VOID build should
not require Apple's sample photographs; this is source inspection, not a fresh
build claim. Older README statements are broader than the current route.

DESERT's **Landmarks/public-catalog browser family still needs** the external
Apple reference checkout expected by `products/landmarks/reference.ts`. It looks
for `references/apple-landmarks-2026-10-15/source/Landmarks/Landmarks` inside
the sibling workspace, including model/localization/assets and specific sample
records. There is no general environment override in that loader. Do not copy
those photographs into GitHub or invent substitute results. Mark that family
blocked if authorized reference assets are unavailable; propose an approved,
licensed reproducibility solution separately.

VOID's `assets/media-samples` and DESERT's motion-study test fixture are original
generated samples with adjacent provenance/license information, not Apple media.
They are included in the source checkpoint after review.

## What is deliberately not uploaded

Private runtime identities, invitation/launch URLs, credentials, PostgreSQL stores,
uploaded media originals/renditions, browser profiles/local storage, local logs,
generated builds/dependencies, and the external Apple reference checkout stay local.
Do not force-add ignored `.local`, `build`, `node_modules`, temporary build trees,
`.env`, PEM/key files or browser evidence. Appearance preferences are device-local
(`desert.appearance/2`), not source or transferable owner state.

The original workspace's `work/` ledgers, conversation and HTML mockups are outside
both Git repositories. Their current requirements and failure history are curated
in this package; raw transcripts and private machine paths are not copied into
public VOID. Request an exact approved reference from the owner only where visual
approval remains genuinely ambiguous. Do not regenerate a mockup and call it the
historically approved one.

## Evidence discipline

`src/build/svelte/revision.ts` includes SDK source, dependency lockfile and Node
version in renderer revision. Freeze these during a comparison. Pin artifacts to
the exact source/Node pair; later source changes require rebuilt artifacts and new
evidence. Unit-test totals from 2026-10-22 do not certify the pushed checkpoint.
No CI workflow currently makes this entire guarantee mandatory; the new proposal
must address real build and continuous-integration paths without weakening them.

Keep authentication, ownership, stale edits, exact receipts, availability and
data-preservation regressions in scope. A visual migration must not silently alter
domain installation digests or erase stored data to make a test/demo run.
