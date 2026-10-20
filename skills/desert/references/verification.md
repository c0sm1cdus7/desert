# Verify mechanisms against commitments

Preserve three distinct things: approved commitments, installed executable
catalog, and independent evidence. Removing a catalog entry does not remove an
approved obligation; generating an entry does not certify it.

Before a new mechanism, write an observable test that fails for the intended
missing behavior. A missing dependency or broken runner is not that RED. Keep
the actual result and revision identity; later characterization remains valuable
but is not retroactive TDD evidence. A generic `throws` check may pass because
everything is unimplemented: pair negatives with positive controls and reasons.

For contract compilation, reject unknown semantics, references and incompatible
versions. Change only a supported definition and prove the behavior changes.
Mutate the original source and returned artifacts to test isolation. Unknown
and missing must not be coerced into known empty or zero.

For execution, check real admission, actor/scope, occurrence, fresh authority,
exact effect binding, rollback, concurrent conflicts and retry identity. Call
every exposed entry, not only a convenience UI. Negative tests must observe
absence of effects, not only an error message.

Review the canonical journey/entry inventory and compare it to the compiled
catalog and actual execution evidence. Do not handwrite a second product as a
fixture: reference its entities and derive cases from declared semantics.
Concrete witness data may complement those definitions, never redefine them.
Check effects independently of the interpreter; mutation tests must demonstrate
that a wrong interpreter fails despite an unchanged contract. Fail on uncovered
or unexecuted entries. Track removed approved commitments across revisions,
separately from current-catalog coverage. Count exercised journeys, not test functions.
For each journey/entry, map happy path, identity/scope rejection, input and state
guards, effect/receipt atomicity, concurrency/retry and dependency loss/recovery
where applicable. Mark inapplicable cases with reasons and missing cases as gaps.
Shared engine tests are supporting evidence, not automatic product certification.

Use `deriveVerification(Product)` from the matching SDK's `src/testing/index.ts`
for the supported local-controller vocabulary. It derives an obligation inventory
for every declared journey and exposed entry, primitive inputs and setup paths
through real journeys. Do not maintain a second fixture catalog or add product-name
branches. Read [the API and limits](testing.md) before running it.

The independent checker observes persisted effects, preserved fields, ownership,
reads and receipts; it does not reuse the production effect interpreter. Generation
is bounded: missing witnesses or search limits are blocked evidence, not skipped
success and not proof of unreachability. Unsupported runtime dependencies fail.
Keep independent regression and mutation tests; derived cases do not replace them.

Call `assertComplete` on the report returned by that same verification instance.
It rejects failed, blocked, incomplete, other-revision or copied reports. The
immutable in-process report is not portable signed attestation: JSON can be saved
for inspection, but loading it cannot authorize a new claim. Rerun on the exact
revision. Read SDK docs/DERIVED-VERIFICATION.md and docs/EVIDENCE-012.md for scope.

A controller test that calls begin/prepare/accept proves neither a human review
screen nor consent from another principal. Test the built surface separately;
an agent interaction artifact is not proof of an installed MCP transport. Declaring
a preference or connector record does not execute the behavior it describes.

For surfaces, verify canonical input constraints and actual behavior under
loading, stale data, disconnect, reconnect, session change and suspension. Keep
drafts only under their retention policy. Local eligibility is not permission.
Late reads and late durable receipts have different correlation semantics.
Keyboard, focus, geometry, accessible meaning and reduced motion need tests of
the built surface; JSON fixtures and screenshots alone do not prove them.

Simulate normalized events and effects at declared boundaries. Do not imitate a
provider API and call that provider conformance. Real adapter and deployment
tests are separate. Do not invent provider credentials or use live resources.

Native consumers use a pinned semantic protocol and supported schema vocabulary.
Derive bindings instead of copying fields. Independent cross-language fixtures
test equivalence; compilation of TypeScript alone proves neither Swift nor Kotlin.

Report each layer honestly: inspected, tested, not implemented, not executed,
unsupported or failed. Don't call a scaffold a completed SDK or a shape validator
an executable product. Skill frontmatter validation is not behavioral validation.
