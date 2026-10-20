# Portable authoring evidence — 2026-10-15

Historical delivery evidence. The failure below was subsequently reproduced and
corrected in the working SDK; see [the correction](EVIDENCE-009.md). The original
export sent to Claude remains unchanged and still identifies its original source.

## Scope

Skill 0.2.0-draft, authoring instructions, mechanically derived reference books,
source packaging and three package tests. No SDK execution semantics or Kenon
implementation changed. No existing Notebook store, credential or contract was
reset. No publication or global skill installation occurred.

The API reference is extracted from actual exports, grammar and runtime entry
modules. Notebook includes all authored modules plus its Svelte entry and build
configuration; the source bundle contains the complete implementation and tests.
Support and runtime books derive from canonical SDK documentation. A drift check
rejects stale generated references. They are not independently maintained APIs.

## Independent installation

A clean source export was created in a temporary directory. Its manifest verified
with Node alone, before installing dependencies. `npm ci --ignore-scripts` installed
97 packages from the included lockfile; npm reported zero known vulnerabilities
at installation time. This is not a security audit.

Environment: macOS, Node 24.16.0, PostgreSQL 18.6, bundled dependency versions and
the locally installed Playwright Chromium. No Linux, Windows or native validation
is claimed. Tests provisioned temporary databases, not user databases.

## Results

- Manifest verification and generated-reference drift checks passed.
- TypeScript typecheck passed, including 37 independent negative type cases in tests.
- Notebook inspection accepted complete input and rejected missing required input.
- Contract digest remained
  `6c1c830e3a77e949e7f5c07ac7d7fca0b303bf3f85353b2ec06e484bac7f2466`.
- Svelte reported zero errors and warnings; production build passed.
- Nine real-browser tests passed against the exported implementation.
- Latest bounded full run passed all 97 tests, including the three package tests:
  `node --test --test-timeout=20000 tests/*.test.ts`.
- Package tests verify reproducibility, self-contained skill links, required source
  inventory, runtime-data exclusion, drift rejection and refusal to overwrite.
- The skill creator's structural validator passed. No fresh independent agent
  authoring trial was performed; this is not behavioral certification of the skill.

## Open intermittent failure — do not hide behind the rerun

Two earlier full runs, one in the source tree and one in the clean export, failed
in `tests/local-availability.test.ts` during PostgreSQL shutdown. The first test
reported `57P01` (connection terminated by administrator command); the second
reported `ENOENT` for the stopped socket. The processes remained alive and their
test workers were explicitly terminated to finish collection.

The same file subsequently passed both tests in isolation with a 15-second bound;
the full bounded rerun passed all 97. The cause has not been isolated. The second
failure may be consequential, but that is not yet established. This is an open
runtime/test-lifecycle investigation, not a packaging failure that justifies
changing execution behavior inside a documentation delivery. No test was removed,
skipped or weakened to obtain the green rerun.

The authoring kit is usable for compilation and contract reformulation. Do not
claim stable outage recovery certification until this failure is reproduced,
explained and resolved with independent regression evidence.

## Delivery identity

The final export adds this evidence and the corresponding support warning to the
tested tree. Its exact source inventory is pinned in AUTHORING-MANIFEST.json;
the manifest excludes itself, dependencies, build outputs and runtime data. Its
hash is an integrity check, not a signature or proof of trusted origin.
