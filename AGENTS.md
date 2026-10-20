# Working on DESERT

DESERT is a fresh SDK implementation of TPA. Do not copy implementation code
from Kenon, Indigo, AgentOS, or the earlier SDK. Existing approved product and
architecture decisions remain requirements, not evidence of implementation.

The owner explicitly authorized the audited Tres Marías visual port on 2026-10-15.
Its selected shadcn pieces/tokens/fonts may be reused with provenance under
src/svelte/vendor. This exception does not authorize copying its product engine,
controller, business semantics or legacy HIG as current DESERT authority.

Read `docs/STATUS.md` before describing support. Follow `skills/desert/SKILL.md`
when defining or implementing products. That skill is a draft, not a replacement
for approved TPA requirements. Its capability statements must match actual code.

The accepted reference stack is TypeScript, Node.js, PostgreSQL, Svelte/SvelteKit.
Keep controller infrastructure out of surface-consumable artifacts. Native hosts
and renderers are separate concerns; see `docs/STACK.md` for scope and status.

Use English for code and maintained documentation. Prefer cohesive modules near
100 lines; exceeding 200 requires explicit review. No minification to evade this.
Keep domain rules in contracts, not framework callbacks or copied validators.

Write independent expected behavior before implementation, preserve honest test
evidence, and label unexecuted checks. Unknown semantics must not be ignored.
Do not expose business writes without admission, trusted authority, atomic
acceptance, concurrency and retry guarantees. Structural validity is not authority.

No publication, production credentials, external spending, or changes to another
agent's repository are implied by local implementation. Do not install this draft
skill globally or certify the SDK as TPA-conformant.
