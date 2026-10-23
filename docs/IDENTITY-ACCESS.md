# Local human identities and access

The installed local controller owns identity credentials and session validity.
Locking revokes the actual session; it is not an overlay over an authorized workspace.
Private object access still uses each command's canonical ownership/admission rules.
An administrator manages identities, not their private notes, tasks or requests.

## Lifecycle and authority

1. An uninitialized host reports onboarding. A one-use launch invitation establishes
   the bootstrap browser capability; merely knowing its localhost URL does not.
2. Initialization atomically creates the first human administrator and an eight-hour
   session. An advisory transaction lock and unique database index prevent concurrent
   second administrators. The launch capability is invalidated afterward.
3. Subsequent visits without a valid human session report locked. Explicit password
   sign-in resumes that identity; it does not create a replacement or change ownership.
4. Lock revokes the current session. The UI clears the mounted workspace and drafts
   immediately. A persisted browser barrier survives reload and locks other tabs;
   only explicit sign-in clears it. If the request fails, it stays locally locked and
   reports that remote revocation could not be confirmed. Startup fails closed when
   browser storage is unavailable. If both storage and revocation fail at lock time,
   the UI explicitly warns that reopening may resume the session; it cannot claim
   durable revocation without either capability.
5. The trusted host API permits the administrator to provision members and disable them. Disabling
   revokes their effective access without deleting their objects. No administrator
   content impersonation, second-admin creation or administrator disabling is exposed.
   These operations are not yet published through canonical command journeys, so
   the browser neither exposes endpoints nor renders an administration bypass.
   The installed Identity view displays session facts and the explicit lock action.

The local controller's trusted `access` API is a host boundary. Browser requests use
the same gateway transport as canonical domain operations: exact origin/host checks,
closed request data, bounded JSON bodies and exact contract digest. Human sessions
use HttpOnly, SameSite=Strict cookies. Credentials never appear in JSON responses.
Build binding verifies a genuine controller before importing the built handler; no
synthetic administrator or developer identity is issued to validate a build.

Each mounted protected workspace is bound to one authenticated browser session,
not merely to the current shared cookie. The ready response includes a
domain-separated HMAC session binding; it is not the credential or its stored hash
and cannot authenticate a request. Every operation, availability check and private
media request sends that fixed binding. The gateway compares it to the cookie's
authenticated session before dispatch and returns the same binding with the reply.
Missing or mismatched bindings fail closed. The client checks its instance and
reply binding before parsing and after consuming asynchronous JSON or bytes.

Explicit sign-in advances a persistent cross-tab generation, hiding previous
instances; the server comparison remains authoritative even if that browser event
is delayed or missed. A definitive locked response retires its instance, and
out-of-order access checks cannot resurrect it. Healthy checks keep the existing
binding. An unavailable controller rejects the unverified reply without treating
unknown availability as identity revocation or discarding the current draft.
An acceptance whose reply is lost during session replacement remains uncertain:
its exact pending activity intent survives for receipt-only recovery, never replay.

Agent/service bearer credentials remain a separate trusted-host capability path.
They cannot administer human identities. Existing developer fixtures intentionally
retain their explicit developer-access gateway and transport mode; an unbound
transport cannot silently choose it. They are not production sign-in.

## Password and session storage

Passwords are 12–256 characters, hashed with Node scrypt (N=32768, r=8, p=1,
64-byte output, random 32-byte salt). At most four derivations run concurrently.
Five failed attempts block that account for five minutes; failures persist in the
database. Unknown identities and incorrect passwords receive the same error.
Session tokens are random 32-byte capabilities; only SHA-256 hashes are persisted.
The canonical executor rechecks credential expiry/revocation on each admission and
acceptance. Reconnecting does not replay a command.

## Explicit limits

This is a trusted loopback host, not a remote HTTPS deployment or hardened multi-tenant
identity provider. Cookies are not Secure on local HTTP. The same OS user, source
administrator and database owner remain trusted. Account lockout is finite local
protection, not a distributed anti-abuse service.

Recovery, password rotation, administrator transfer, OAuth/MCP enrollment, passkeys,
MFA and native secure storage are not installed. There is no recovery link that
pretends otherwise. Losing the administrator password requires a future explicit
recovery mechanism; the host must not silently reset the identity or its store.

Evidence: `tests/identity-access.test.ts`, `tests/identity-http.test.ts`,
`tests/identity-binding.test.ts` and `tests/identity-host.test.ts` exercise actual
PostgreSQL, persistence and loopback HTTP. `tests/identity-browser.test.ts` exercises
the actual Svelte gate in Chromium against that controller: initialization, rejected
sign-in, sign-in to the same identity, lock, still-valid cookie after offline lock,
component recreation, compact width and cross-tab lock. `tests/identity-client.test.ts`
checks fail-closed replies/storage and `tests/identity-draft-disposal.test.ts` checks
late-response isolation. `tests/identity-session-binding.test.ts` rejects stale and
missing bindings over real HTTP before reads, writes, activities, availability,
media and lock. `tests/identity-transport-binding.test.ts` covers before/after-body
generation changes and controller outages; `tests/activity-session-change.test.ts`
keeps exact recovery after a real acceptance with a discarded session reply.
These do not certify built-product visual acceptance,
assistive technologies, native parity or remote authentication.
