# Visual catalog enforcement handoff

## Mission and current verdict

Prepared on 2026-10-23 for an independent external agent at the product owner's
request. Preserve this implementation as an **unqualified checkpoint**, not an
approved visual baseline. The owner wants an independent diagnosis and concrete
proposal first, will bring that proposal back for review, and then wants the
external agent to implement the accepted enforcement work. Do not infer permission
to redesign the product, deploy services, spend money, or erase local data.

The central requirement is unambiguous: **the Visual Catalog contains the only
authorized visual building blocks. Foundations implement those blocks; compositions
combine authorized blocks. No product, renderer adapter, shared composition or
internal SDK owner may invent another visible control, appearance or behavior.**
Being registered in an internal manifest does not establish visibility or approval.
Publishing a composition does not authorize the new primitives it draws internally.

Three independent reviewers found that the current implementation does not enforce
this rule. The most visible incident is a password field rebuilt with lower-level
pieces and an `access` presentation that applies `rounded-full`, despite canonical
`TextInput` already supporting passwords. This is not an isolated CSS defect.

## Repository pair and checkpoint

| Repository | Role | Remote | Handoff branch |
| --- | --- | --- | --- |
| DESERT | SDK, contracts, runtime, renderers, bank, enforcement | https://github.com/c0sm1cdus7/desert | `codex/module-architecture` |
| VOID | Reference product consuming DESERT | https://github.com/c0sm1cdus7/void | `codex/module-architecture` |

Keep clones as sibling directories named `desert` and `void`: VOID depends on
`desert-sdk` via `file:../desert`. DESERT is private; VOID is public. The external
agent needs explicit repository access to both. Do not copy private SDK source into
VOID to work around missing access. Do not change repository visibility.

Before this handoff, DESERT HEAD was `46c1c04f33d7fa73e82e973f519baa2d58b69aa3`
and VOID HEAD was `955ae741fa343dfe0217f3096206d5a4ac952510`. There is substantial
subsequent source work in this checkpoint. Obtain the exact new commit pair from
the delivery message and VOID's companion handoff; pin both before testing.
Those original commits are historical baselines, **not** the source under audit.

The workspace parent is not a Git repository. Conversation ledgers and original
mockups outside these two repositories are not automatically available to a cloud
agent. This package carries their governing decisions and audit findings forward.
It does not pretend that the old browser, private data or local evidence directories
are available after cloning.

## Required reading order

1. Both repositories' `AGENTS.md` and this file.
2. [Owner requirements and decision precedence](handoff/2026-10-23/REQUIREMENTS.md).
3. [Independent findings and source map](handoff/2026-10-23/FINDINGS.md).
4. [Concrete work plan and acceptance gates](handoff/2026-10-23/PLAN.md).
5. [Setup, tests, protected state and evidence](handoff/2026-10-23/OPERATIONS.md).
6. [Existing visual contract](VISUAL-CATALOG-CONTRACT.md) and
   [enforcement specification](VISUAL-CATALOG-ENFORCEMENT.md).
7. [SDK anatomy](architecture/ANATOMY.md), [status](STATUS.md), the bundled
   [DESERT skill](../skills/desert/SKILL.md), and VOID's `docs/ANATOMY.md`,
   `docs/MODULE-ANATOMY.md`, `docs/ROADMAP.md` and companion handoff.

Existing status/anatomy documents contain historical assertions and partial
qualification. They are navigation aids, not evidence that the visual law holds.
In particular, passages allowing every "catalog owner" to implement its own DOM
must not be used to authorize compositions to reconstruct foundations. Retain
legitimate structural layout ownership without turning it into control ownership.

## Product architecture to preserve

DESERT is a new TypeScript/Node/PostgreSQL/Svelte implementation of TPA. VOID
declares modules, objects, policies, commands, queries, journeys and typed Views.
The public product path is `composeProduct(...)`; its admitted View program is
derived into execution and distribution artifacts, not supplied as a second UI.
VOID's root is `src/void.product.ts`. Product files under `src/` have no HTML, CSS,
Svelte, renderer callbacks, private controller or duplicated business validation.

Views use SDK-issued `Components` values and typed ports. Journeys bind operations
and navigation; Views do not know journey IDs. Module roots export opaque public
references; consumers do not import another module's internals. Human and agent
execution share applicable admission, authority, prepare/accept and receipt rules.
Availability does not grant authority; relationships do not grant read access.

Do not solve visual enforcement by replacing this architecture with a handwritten
VOID frontend. Most defects under discussion are **inside DESERT's shared renderer**.
Also preserve identity isolation, protected reads, stale-edit checks, exact-receipt
recovery, unknown versus empty values, and late-event ownership. Visual correctness
does not justify disabling any of those protections.

The current product includes Notes, Tasks/Projects, Media, System, Appearance,
Identity, Home and Visual Catalog. Scope is uneven: collaboration, real actor/task
assignment, remote environment provisioning, OAuth/recovery and native renderers
are not completed merely because the web walkthrough exists. Read current source
and tests before quoting a capability; older image-only/task-label descriptions
may be superseded by later source in this checkpoint.

## Why another agent is taking this work

The owner repeatedly stated that anything not in the Visual Catalog does not
exist. The assistant recorded that rule, then delivered several rounds as ready
for testing while global ownership remained unqualified. Functional test counts,
catalog entry counts and typed local variants were treated as sufficient evidence.
They were not. The owner kept finding violations manually, including elementary
input shape and alignment differences. The handoff must not ask the owner to
explain the same rule again or act as the primary regression detector.

The requested separation of duties is deliberate: the external agent establishes
and implements enforcement; the original conversation retains product knowledge
and later resumes product development on the independently reviewed foundation.
No external agent has been started automatically by this handoff operation.

## First deliverable expected from the external agent

Return a proposal with an evidence-backed inventory, the exact authority model,
all paths that can currently draw, an approval/version strategy, a migration order,
independent negative tests, and explicit unresolved questions. Identify which
current visual parts are approved, merely implemented, missing from inspection,
or ambiguous. **Do not retroactively approve invented parts.**

Explain how the normal product build will reject both the observed lock bypass
and materially different escapes. Explain how Appearance's selectable cards,
swatches and previews map to approved foundations/compositions. Explain how a
future contributor adds a legitimate component without bypassing owner approval.
Distinguish automatic structural enforcement from human approval of appearance.

The proposal must not be a renamed inventory, an allowlist of current files, a
global CSS patch, a new warning-only audit, or another promise to remember the
rule. The owner will relay it back for review before implementation proceeds.
