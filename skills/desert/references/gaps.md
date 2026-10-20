# Preserve intent when the SDK cannot express it

Separate approved product intent, an explicitly limited executable subset, and
capability proposals. For each gap record the requirement, insufficiency of current
vocabulary, proposed semantics, enforcement boundary, positive/negative acceptance
cases and affected code/packages. Do not invent callable APIs to suggest implementation.
Keep proposals explicitly unapproved until the owner accepts an exact revision.
First distinguish an inconsistent implementation/type signature from missing
semantics: a defect does not justify redefining product boundaries around it.

## Authority and consent

Identify protected operations/resources, trusted actor evidence, scope and conditions.
Policy names do not enforce access; input strings are not trusted roles.

A consent record is not an execution gate. Specify who may consent, the exact
material/effect and revision covered, applicability/expiry and invalidation.
Acceptance must reject missing, mismatched or stale consent through every entry.
Changing an effect must not inherit approval for its previous version.
Review is presentation, not attested authorization. Locality and reversibility do
not waive permission. Policy obligations cannot become optional UI settings.

## External effects

Describe effect, target, scope and credentials before choosing CLI, HTTP or MCP.
Those are channels. External writes need operation identity, acceptance/completion
semantics, an adapter boundary, reconciliation and safe retry conditions. A timeout
is not failure or success evidence. Do not generate a replacement operation blindly.

Effect properties can overlap: an external operation may also spend money and be
irreversible. Do not erase obligations through an exclusive category or map an
unclassified effect to a known category. Unknown scope/semantics blocks execution;
consent alone does not make an unspecified effect safe or implemented.

When proposing an outbox, local acceptance and its pending operation can share a
database transaction. A remote provider effect cannot be promised atomic with that
transaction. Separate prepared, accepted, executing and observed-result states;
execution cannot precede acceptance. Adapter idempotency declarations need evidence.
These are proposal review constraints, not newly installed effect/outbox APIs.

## Internal journeys

An internal product intent with authority, effects or an observable lifecycle belongs
in its contract even without human exposure. Parsing or tokenization need not become
journeys. The current executor requires an explicitly exposed session surface;
an internal scheduler is a gap, not permission to expose privileged work everywhere.
Exposure is not authority or necessarily public networking. Keep admission checks
on internal entrypoints too. Product-specific deliberation loops, model selection
and escalation limits belong to the product; do not bake them into SDK mechanisms.

## Facts and transitions

Distinguish origin kind from actor identity, business intent from execution attempt,
workflow state from provider evidence. Define each transition's actor, guard and
effect; an enum implements none of these. Unknown is not a human answer unless
the product explicitly permits it.

References, instants, material digests and derived facts need their own validation
and resolution. Do not replace them with unchecked text or opaque functions and
claim support. A dependency declaration alone does not provide its mechanism.
References do not grant access, but different owners are not universally forbidden:
the applicable authority contract determines which cross-identity references are valid.
