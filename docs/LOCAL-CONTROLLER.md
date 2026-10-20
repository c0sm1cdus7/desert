# Local controller: Notebook on Node and PostgreSQL

Status: implemented and integration-tested on Node 24.16.0 and PostgreSQL 18.6,
macOS. No Internet, HTTP server, cloud identity or external provider is required
for the implemented operations. Dependencies and PostgreSQL must already be installed.
Linux uses the same Unix facilities but was not tested; Windows and native app hosts
are not implemented. This is a developer runtime, not a completed Human Surface.
The separate [Svelte bootstrap](EVIDENCE-006.md) now exposes the same local session
through a loopback-only HTTP host; no Internet service is required.

## Product code stays declarative

`products/notebook/commands.ts` defines the effects. The local interpreter evaluates
those expressions directly. It does not know what a note or an archive means.
`OnlyOwnerCanAccess` provides the owner field; it is not restated in a Notebook service.
The runtime supports the existing finite read/create/update and ownership vocabulary.
Unsupported extra dependencies fail installation rather than being treated as available.

## Open a controller

```ts
import { compile } from "../src/index.ts";
import { openLocalController } from "../src/local.ts";
import { Notebook } from "../products/notebook/product.ts";

const application = compile(Notebook);
const controller = await openLocalController(application, {
  socketDirectory: "/private/path/to/postgres-socket",
  database: "notebook",
  user: "local-host",
  role: "notes",
});
```

Those infrastructure values must identify an existing, private local database;
the snippet is a configuration example, not a command to create that path. The
Notebook bootstrap supplies a real cluster automatically. The generic API accepts
only an absolute Unix socket directory owned by the current OS user with no group
or other access. Installation requires a writable primary with `fsync` and
`full_page_writes` enabled; transactions explicitly request synchronous commit.

Each database is pinned to one product, exact contract digest, role and schema
revision. Reopening a different contract fails with `INSTALLATION_MISMATCH`.
Session operations recheck that installation inside their transaction, even if
an earlier availability snapshot was ready.
Automatic migration, signing and a full assembly/toolchain lock are not implemented.

## Identity is a host authority, not command input

The privileged host calls `controller.identities.issue(label)` and protects the
returned random bearer credential. Only its SHA-256 hash is stored in PostgreSQL.
`controller.connect(token, surfaceId)` exposes a limited session, not identity
administration or direct object writes. A caller cannot supply the owner in input.

Credentials default to a 30-day lifetime, configurable by the host. Admission
defaults to five minutes, configurable with `runLifetimeMs` up to one day. These
are host security lifetimes, not Notebook business facts. Expiration and revocation
fail closed; automatic renewal/credential rotation is not implemented. A runner with
an expired credential needs explicit host administration, not a new silent identity.

The trust boundary is the host process, database administrator and OS user. A
same-user process with filesystem/database access can bypass application isolation.
Do not expose the host object, raw DB credentials or the credential file to plugins
or an untrusted surface. This is not an adversarial code sandbox, OS login service,
hardware-backed keystore, encryption-at-rest guarantee or remote authentication API.

## Admission, preparation, acceptance

```ts
const session = controller.connect(identity.token, "human");
const run = await session.begin("create-note");
const intent = await session.prepare(run.id, {
  title: "Idea",
  body: "Write it down.",
});

const receipt = await session.accept(intent.id, intent.confirmationDigest);
const read = await session.begin("read-note", receipt.object.id);
const notes = await session.read(read.id);

const archive = await session.begin("archive-note", receipt.object.id);
const archiveIntent = await session.prepare(archive.id, {});
await session.accept(archiveIntent.id, archiveIntent.confirmationDigest);
```

Human renderers follow the declared commit mode: explicit submission or a separate
review. Both retain exact prepared-effect acceptance. Its digest binds actor,
surface, run, journey, contract, input and exact effect, including subject/version.
The digest is not proof that a human saw a UI. An authenticated call accepts that
intent; this product does not declare an additional human-only approval policy.

A run permits one mutation occurrence. Repeated identical preparation returns the
same intent; changed input is rejected. Acceptance locks the run and affected object,
checks fresh identity, ownership, conditions and version, then recomputes the effect.
The object change, completed run and receipt commit together. The receipt is returned
only after commit. All statements use the same transaction client, following the
[node-postgres transaction contract](https://node-postgres.com/features/transactions).
Object/run locks use [PostgreSQL row locking](https://www.postgresql.org/docs/18/explicit-locking.html).

Repeated acceptance of the same intent returns the stored receipt, including after
run expiry, provided the identity remains valid. Two separately prepared mutations
against one version cannot both succeed. `session.receipt(intentId)` recovers a known
operation without replay. A commit transport error is reported as `COMMIT_UNCERTAIN`;
do not create a replacement intent automatically. Recovery itself can also be unavailable.

Reads also require an admitted, unexpired read journey and current identity. They
apply the ownership policy and only return fields declared by the read contract.
Archived notes remain readable because the current read contract does not exclude them.

## Persistent developer runner

With Node 24 and PostgreSQL tools on PATH, from the DESERT checkout:

```sh
npm run notebook:local -- prepare create-note '{"title":"Idea","body":"Write it down."}'
npm run notebook:local -- accept <intent-id> <confirmation-digest>
npm run notebook:local -- read read-note
npm run notebook:local -- read read-note <note-id>
npm run notebook:local -- prepare archive-note '{}' <note-id>
npm run notebook:local -- accept <archive-intent-id> <confirmation-digest>
npm run notebook:local -- receipt <intent-id>
npm run notebook:local -- watch
```

Substitute IDs/digests from the prior output. The runner boots a dedicated cluster,
performs the requested operation and stops the cluster. It uses a private Unix socket
and sets an empty `listen_addresses`; it never connects to an existing user database.
Its data and local credential persist under `.local/notebook`, excluded from Git.
The credential is stored in a mode-0600 file within a mode-0700 directory; do not
share that file. This runner is a diagnostic CLI, not the planned Human Terminal renderer.

Concurrent runner invocations fail on `runner.lock`; runtime concurrency is tested
through independent database connections. After an interrupted runner, inspect its
own cluster/process before clearing a stale lock. Do not erase the data directory
to recover a session. Existing data, including the demonstration note, is retained.

## Observe the actual runtime

```ts
const availability = session.watchAvailability();
const unsubscribe = availability.subscribe(({ journeys }) => {
  console.log(journeys["create-note"]);
});

// On surface teardown:
unsubscribe();
availability.dispose();
```

This is executable API, not a suggested future adapter. The session supplies its
actual controller, exact compiled contract, exposed surface and credential. The
consumer cannot supply a digest, actor ID or a `ready` event. The controller derives
journey dependency closures from the existing compiled surface; only its own role
receives observations. Other dependencies remain unknown. This does not install or
validate an arbitrary distribution plan or claim its renderer exists.

The initial snapshot is unknown. A successful, read-only database transaction
checks installation identity, schema revision marker, durable writable-primary
settings and the actual credential. The same credential verification is used by
execution; probes do not take the write-path identity lock or admit journeys.
They create no objects, intents, runs or receipts.

Defaults are a 500 ms delay between completed probes and a 1500 ms evidence lifetime,
measured from probe start, not completion. Hosts may configure `pollIntervalMs` and
`validForMs` (positive integers up to 60000 ms, polling delay shorter than lifetime).
Probes are sequential. Evidence can become stale while a probe waits for a database
lock or connection; the last success is never renewed merely because a timer ran.

Subscribers receive snapshots without navigation, including freshness expiration.
Ready means recent dependency evidence, not permission, valid input or guaranteed
future execution. Lost reachability can take until the next failed probe or lease
expiry to appear; no instantaneous detection is claimed. Event-loop suspension also
delays notifications; `snapshot()` checks elapsed time when read after resumption.

| Actual condition | Observation |
| --- | --- |
| Compatible local installation and valid credential | Ready |
| Socket missing/refused or PostgreSQL terminating | `unreachable` |
| Revoked, expired or invalid credential | `session-required` |
| Different product, digest, role or revision marker | `incompatible` |
| Probe/storage error not classified above | `unavailable` |
| Prior evidence lifetime elapsed | `stale` |
| Observer or controller closed | `disposed` |

Idle pool failures are handled according to the [node-postgres pool error contract](https://node-postgres.com/apis/pool).
Every connected client also retains a lifetime error handler, including the gap
between pool checkout and await resumption. Faulted clients are rejected before
transaction work/commit and destroyed on release; faults never trigger replay.
See [the checkout regression and fix](EVIDENCE-009.md).
PostgreSQL failures use [SQLSTATE codes](https://www.postgresql.org/docs/18/errcodes-appendix.html),
not translated error strings. Existing local identity/installation errors retain
their exact SDK error identifiers. A reachable database alone is insufficient.

Recovery means observing again, never replaying a write, silently replacing an
identity or accepting an intent. Closing the controller disposes all watchers,
cancels schedules and drains outstanding database work. An already completed
operation remains recoverable only through its receipt API and current authority.

`watch` prints snapshots only when their visible state changes. Stop it with Ctrl-C;
it stops its owned cluster and preserves the database. The tests exercise outages
only in isolated temporary clusters, never in the persistent demonstration store.

This monitor is in-process with the local host. A killed host cannot notify its own
dead subscribers; cross-process/device detection needs a separate transport adapter.
Probes are not exhaustive disk-space, schema-corruption, privilege or power-loss
certification. Command transactions remain responsible for actual execution failures.

## Still outside this increment

Native packaging, browser offline installation, remote availability probes,
remote transport, external effects, sync, offline write queues, general multi-step
graphs, credential renewal UX, backup/restore and power-loss fault injection.
Local transactions are real; these missing integrations are not implied by them.
