# Evidence 013 — contract-driven distribution builds

Date: 2026-10-15. Scope: a general build entrypoint with the first installed Svelte
web builder and verified mounting to the existing local controller. No native,
CLI or controller builder, new product policy, migration, or visual redesign.

## Red before implementation

The initial real-build assertion expected `built`, while the initial implementation
returned the existing `unbuilt` plan. It failed at that assertion under Node 24.
An earlier accidental Node 20 invocation failed to load TypeScript and is not
counted as behavioral red evidence.

## Independent checks

- A declared web target produces the real handler and a verified file manifest.
- Existing output is preserved on rejection; unsupported targets, browser-local
  bindings and input primitives publish nothing.
- Modified or extra files, symlinks, unknown manifest fields and mismatched
  distribution, renderer, surface, role or contract identity are rejected.
- A copied session object cannot stand in for the actual installed controller.
- A matched session serves the built page and assets; modifying the original
  artifact after mounting cannot change the private served snapshot.
- Internal files and unknown pages return 404; non-read requests to the static
  page return 405. The existing authenticated API gateway remains separate.
- A second contract renames product/object/journey/fact identities and changes
  creation to review. The same builder produces a working browser application;
  no object exists before confirmation, and acceptance persists the renamed fact.
- Existing browser scenarios still exercise create/read/archive, real database
  and transport failure/recovery, draft preservation and authority boundaries.

## Verification record

Executed with Node 24.16.0, PostgreSQL 18.6 and installed Chromium:

- `npm run check`: typecheck passed; 160 root tests passed, no failures/skips/todos.
- `npm run web:check`: zero errors and warnings.
- `npm run web:build -- build/notebook-web-r5`: actual production build completed.
- `DESERT_WEB_BUILD=build/notebook-web-r5 npm run test:web`: 10 passed, no
  failures/skips/todos. This includes the separately built renamed product.
- Skill structural validation passed. Source/reference and immutable-bundle
  reproducibility checks are included in the root suite.

The first unknown-route check exposed a SvelteKit fallback returning 500; explicit
manifest-derived public route filtering now returns 404 without that fallback.
Typechecking caught an overly mutable manifest parameter; the handler now accepts
the verified readonly manifest directly, without a cast. Both final suites ran
against the corrected source. The final web build is subsequently moved to the
default `build/notebook-web` path unchanged; the earlier development build is kept
separately. Generated builds are not part of the source bundle.

The original Notebook on port 4271 and its persistent database were not restarted
or migrated. Checks use private temporary databases, isolated artifacts and free ports.

## Limits

The manifest is a consistency check, not signed attestation; an attacker able to
replace the manifest and its files is outside this boundary. The renderer fingerprint
includes source, lockfile and Node version, not measured installed dependency bytes.
Output is not claimed reproducible byte-for-byte across builds. Build success is
not runtime availability, authority, complete journey coverage or TPA conformance.
The service declaration is checked but not built or certified as an agent transport.
