# Notebook preservation, evidence accounting and one product definition

Date: 2026-10-15

## Scope

No production interpreter, public authoring API, grants, renderer or generic
conformance framework changed. This increment strengthens Notebook tests and
adds a local evidence runner.

The owner identified a duplicated product in tests/fixtures/notebook.ts.
That handwritten copy has been removed: negative compiler tests now mutate a
clone of the real Notebook. The former mirror-equality test is replaced with a
JSON transport/digest test. Execution cases reference canonical journey entities;
input fields, kinds and target states are derived rather than redeclared.
Concrete sample strings remain fixture data. Generic automatic derivation for
arbitrary products is not implemented.

## Observed checks

- TypeScript checking passed; 147 root tests passed, zero failed/skipped/todo.
- Tests verify fixture isolation, canonical entity references and a contract-only
  change updating the derived case without a parallel fixture edit.
- Archive preservation passed through human and agent controller sessions.
  Fields outside the declared write set remain equal to their prior values;
  literal assignments, identity, version increment and acceptance replay are checked.
- An isolated Node load hook corrupts the real update interpreter's body field.
  Both preservation cases fail with ARCHIVE_PRESERVATION_VIOLATION while fixture
  preconditions succeed. The control run passes and the production file is unchanged.
- Actual skipped, undiscovered and setup-blocked runs are rejected as evidence.
  Unit checks additionally reject duplicate, unknown, todo, failed, incomplete
  and wrong-revision evidence.
- A previously successful report for revision
  2c386c8576bf882283833b41f9cb9771a93f821f4df80d8a5a6cd5c4d754b10d
  was rejected after this refactor with EVIDENCE_REVISION_MISMATCH (exit 1).
- Browser tests were not rerun; no surface or production runtime code changed.

## Reproduction

```sh
npm run check
npm run verify:notebook
npm run verify:notebook -- --check artifacts/notebook-evidence/<report>.json
node --import ./tests/fixtures/corrupt-update-hook.ts --test tests/notebook-preservation.test.ts
```

The last command is deliberately RED. The root mutation test requires the
expected RED and a passing control; it does not disguise an unexecuted check as green.

## Limits

The required case report covers 34 local-session tests, not all 147 SDK tests
or browser/MCP/native conformance. Hashing source and recorded runtime versions
is not binary attestation, a signature or protection from a malicious host.
Generating the case inventory from the product does not certify the product's
intent, prove all possible behavior or preserve removed historical commitments.
The independent checker and interpreter mutation test prevent the specific
self-confirming failure demonstrated here, not every conceivable shared mistake.
