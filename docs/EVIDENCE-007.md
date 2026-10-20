# Object context, mutation journeys and contract-declared review

Date: 2026-10-15. Scope: DESERT and Notebook. Tres Marías and Void are unchanged.

## Authored meaning

`products/notebook/surfaces.ts` declares:

```ts
entry: ReadNote,
primaryAction: CreateNote,
subjectActions: [ArchiveNote],
commit: {
  "create-note": "submit",
  "archive-note": "review",
},
```

This belongs to the human interaction contract, not a web-only setting. Human
distribution targets reference this same surface; no CLI or native renderer is
claimed by this increment. The agent surface does not inherit human screen choices.
The contract says which interaction commits; the renderer does not guess from
field count, journey names or risk heuristics.

Every exposed mutation needs one known commit mode. Reads cannot have commit modes.
TypeScript authoring rejects missing mutation entries, read entries and unsupported
modes. Runtime compilation also rejects these cases and foreign journey references.
There is no silent default when consuming serialized contracts.

The exact Notebook product digest is now:

`6c1c830e3a77e949e7f5c07ac7d7fca0b303bf3f85353b2ec06e484bac7f2466`

The public interaction projection is `desert.interaction/4`. Commit modes are
deep-frozen and included in the product definition used for its digest.

## Derived behavior

`HumanProduct.svelte` selects collection, object context or mutation journey.
`ObjectContext.svelte` renders the read projection and declared subject actions.
Back is collection navigation in the context header, not a command-step footer.
Actions still use live dependency evidence and controller offers. Archival conditions
and ownership are not copied into Svelte.

`Journey.svelte` contains form, review and recovery presentations, never object
detail. `mutationFlow.invoke` captures the explicit invocation and its input snapshot:

1. Validate against the generated command schema and check current dependencies.
2. Admit and prepare through the real controller.
3. If the draft changed while preparing, do not accept the obsolete invocation.
4. Follow the installed contract: wait in review, or accept that exact prepared intent.
5. Show the resulting object context only after a correlated receipt.

Controller `prepare` does not commit. The `confirmation: prepared-effect` invariant
still binds the accepted effect; it does not mean every human action needs a second
screen. Both commit modes retain authenticated identity, ownership, current conditions,
version checks, atomic effect/receipt storage and idempotent acceptance.

An uncertain response retains the original intent. Recovery checks its receipt;
explicit retry reuses the same intent and digest. Neither reconnection nor input
changes create an automatic retry. New edits made after acceptance starts are not
included in that operation and are not erased when its reply arrives.

## Verification

- `npm run check`: TypeScript and 94 root tests, including real-controller client-flow tests.
- `npm run web:check`: zero Svelte errors or warnings.
- `npm run web:build`: production SvelteKit build.
- `npm run test:web`: nine Chromium tests using isolated real PostgreSQL stores.

New or strengthened evidence:

- `tests/human-commit.test.ts`: strict modes, references, immutable projection and digest sensitivity.
- `tests/types-distributions.ts`: additional negative compile-time authoring cases.
- `tests/human-flow.test.ts`: changing only the contract changes when a real write
  occurs. Review writes nothing until confirmation; submit writes immediately from
  the invocation. Invalid input writes nothing and concurrent invocations create once.
- `tests/web/notebook.test.ts`: direct creation, object context without a journey
  footer, Archive inside Actions, review cancellation and final archival.
- `tests/web/submission.test.ts`: stale draft preparation, explicit same-intent retry
  after a lost committed reply, and preservation of edits made during acceptance.
- Existing outage, revocation, receipt recovery and HTTP boundary tests still run.

Recorded RED before mechanism changes: the new mode projection was rejected, Notebook
had no authored commit modes, and the form had no direct Create note submit button.
Three of six selected checks failed on those missing behaviors. Later integration
checks were added during implementation; they are not represented as prior RED evidence.
One later failure was a test querying body from the collection projection; the test
was corrected to read the detail projection, without broadening product exposure.
Node's strip-only runner also exposed a parameter-property constructor in the client
error type; explicit property initialization preserves behavior and allows direct testing.

Actual browser screenshots inspected: `artifacts/notebook-compose.png` and
`artifacts/notebook-context-actions.png`. This is not a new design-system certification.

## Limits and installation safety

The human renderer is a trusted mechanism. A review screen is not cryptographic
proof that a human examined it. The controller always rechecks execution authority,
but this increment does not introduce externally attested human approval, policy
floors for high-risk actions, external effects, or untrusted remote response handling.
Unsupported semantics remain rejected rather than being treated as submit-safe.

The source action and current draft are visible to the user. The local command
language has deterministic declared effects and no provider-generated hidden effects.
Future effect types need their own interaction/authorization requirements before
they can use direct submission; this is not blanket permission to skip review.

The previous digest was
`40c5003adb33d5edaeee6ed1db0e7aa3b7133525d265ee0531b689d6458558f0`.
Existing installations must still reject a digest mismatch. No store was reset,
silently repinned or migrated. Existing notes, identities and receipts in the user's
demonstration store were not modified by the tests. A live upgrade of that store
requires explicit migration support; a separate new test store is also possible.
Draft retention remains mounted-session memory, not persistence across reloads.
