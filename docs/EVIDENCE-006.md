# Notebook: real Svelte surface and recovery

Date: 2026-10-15. Scope: DESERT and Notebook only. Void remains outside this increment.
This is implementation evidence, not a declaration of complete TPA conformance.

## What the author writes

Notebook's facts, effects, ownership, journeys, labels and connection policy remain
in `products/notebook/`. Its product definition has not changed in this increment.
The exact product digest remains:

`40c5003adb33d5edaeee6ed1db0e7aa3b7133525d265ee0531b689d6458558f0`

`apps/notebook/vite.config.ts` binds `compile(Notebook)` to the generic human-module
builder. `apps/notebook/src/routes/+page.svelte` binds the generated artifact and
validator to `HumanProduct`. Neither file implements business CRUD or validation.
`products/notebook/run-web.ts` owns local host lifecycle and private browser admission.

## What DESERT supplies

| Mechanism | Source | Authority boundary |
| --- | --- | --- |
| Ordered interaction projection | `src/project-surface.ts` | References existing authored fields; no new domain schema |
| Standalone validators | `src/web/build.ts` | Generated from compiled command input schemas, no browser eval |
| Human renderer | `src/svelte/` | English single-object text-record navigation; unsupported composition rejected |
| Typed transport requests | `src/web/protocol.ts` | TypeBox grammar derives TypeScript inputs and runtime validation |
| Session bridge | `src/web/gateway.ts` | Uses the existing controller admission/prepare/accept/receipt boundary |
| Contextual offers | `src/local/offer.ts` | Ownership and the same condition matcher used by execution |
| Availability transport | `src/web/client/connection.ts` | Real probes, remaining lease minus round-trip time, no online flag |
| Draft and recovery | `src/web/client/` | Mounted-session draft, explicit acceptance, receipt lookup, no replay |

The compiled surface still says `not-installed`: compilation alone does not launch
anything. The explicit host opens the local controller and then serves the built
surface. Distribution plans remain `unbuilt`; this is not automatic packaging.

## Actual checks

- `npm run check`: TypeScript passes; 89 tests pass, including new projection,
  generated validator parity, invitation and contextual-offer tests.
- `npm run web:check`: Svelte diagnostics, zero errors and warnings.
- `npm run web:build`: production SvelteKit client and adapter-node build.
- `npm run test:web`: six Chromium integration tests against real isolated PostgreSQL.
  No test uses the persistent Notebook demonstration database.
- `npm audit --omit=optional`: zero reported vulnerabilities for this pinned tree.

Browser scenarios:

1. Create, review the prepared effect, accept, read and archive. Verify persisted
   state via a separate controller read. Already-archived action is disabled.
2. Stop the actual database while editing. Readiness changes, actions disable, the
   draft remains editable. Restart PostgreSQL: readiness returns without submitting.
3. Cut browser transport using Playwright's offline mode. Continue typing. Restore
   transport: no navigation/reload, no automatic business write, draft intact.
4. Let a real acceptance commit, then deliberately abort only its HTTP response.
   The UI retains the original intent. Receipt lookup recovers one note and proves
   there was exactly one submission. This is transport fault injection, not a fake
   provider, fake receipt or simulated database result.
5. Revoke the actual identity while editing at a mobile viewport in dark mode.
   Actions block, the draft remains, and direct controller admission rejects it too.
6. Check HttpOnly/SameSite cookies, unauthenticated access, cross-origin POST,
   wrong digest, forged actor/owner fields and replayed browser invitation.

Generated-validator tests change only the title contract's maximum length and
compare browser/server acceptance, including Unicode, missing/unknown fields and
wrong types. Generated code rejects accessors without executing them and freezes
its interaction projection. Readiness is never substituted for authorization.

## Defects found during verification

- The projection originally omitted authored field order/object references. The
  new projection test failed first; the compiler now carries those references.
- Strict CSP blocked SvelteKit's screen-reader announcer's generated inline style.
  The exact style hash is now allowed via `style-src-attr`/`unsafe-hashes`. No general
  `unsafe-inline` or `unsafe-eval` was added. Preserve the announcer; reverify this
  pinned hash on dependency upgrades. Browser tests assert no CSP/page errors.
- Browser invitation comparison now checks UTF-8 byte lengths before constant-time
  comparison, preventing malformed Unicode from raising an unexpected exception.
- Late connection bootstrap cannot start polling after the component is destroyed.
- Each action uses its own journey readiness, not the entry journey's ready flag.

Only the projection change has recorded test-first RED evidence in this increment.
Other tests were added during implementation; do not relabel them all as strict TDD.

## Boundaries and limitations

- Availability is sampled, not instantaneous. The local probe renews finite leases;
  the browser polls and expires evidence even if a request stalls. Transport delay
  never extends the host's readiness lease. No command runs on reconnection.
- Drafts survive controller/network interruptions in the mounted tab. Closing,
  reloading or killing it is not durable draft storage. A before-unload prompt is
  best effort, not a persistence guarantee. No service worker or offline cold start.
- No Internet is needed after dependencies and PostgreSQL are installed. The web
  host must still be running and reachable on loopback to load the application.
- The launch invitation is single-use and process-scoped; the session cookie is
  HttpOnly and SameSite=Strict. Loopback HTTP has no TLS; this is a trusted single-OS-user
  local host, not a remote production service. The durable identity token stays in
  the host's private storage. Identity renewal UX and multi-browser enrollment remain
  future work; a new host launch creates a new browser invitation.
- HTTP inputs are runtime validated; generic response TypeScript types are derived
  from the local session. Availability and confirmation correlation are checked,
  but this is not a complete schema-validated protocol for untrusted remote servers.
- No multi-object navigation, arbitrary graph, nontext form primitive, multi-user
  push feed, durable draft sync, native packaging, haptics or complete HIG certification.
  External record changes are refreshed on selection/reconnection, not a live data feed.
- Dependencies are pinned. `cookie` is overridden to 0.7.2 to remove the transitive
  0.6 advisory. This narrow change was exercised in the production browser build;
  it is not a general security certification.

Screenshots: `artifacts/notebook-compose.png`, `notebook-disconnected.png`, and
`notebook-mobile-dark.png`. They show actual browser rendering, not mockups.

## Upstream mechanism references

- [SvelteKit adapter-node](https://svelte.dev/docs/kit/adapter-node)
- [SvelteKit routing](https://svelte.dev/docs/kit/routing)
- [Ajv standalone validation](https://ajv.js.org/standalone.html)

The checked local dependency versions, not a floating documentation example, define
the build: Svelte 5.57.2, Kit 2.70.3, adapter-node 5.5.7, Vite 7.3.7, Playwright 1.64.1.
