# Notebook: one product, shared interaction, multiple distributions

Status: design proposal, not an implemented API or approved SDK revision.
Date: 2026-10-14.

The owner explicitly added a terminal human surface in the CLI distribution.
It shares the human interaction contract with web and iOS. A CLI is not implicitly
an agent surface. Native packaging remains undecided; SwiftUI below is an
illustrative renderer binding, not a delivered renderer or rejection of Capacitor.

All imports from `@desert/*` below are proposed APIs. None of these modules is
installed. A subsequent implementation now compiles a finite contract subset using
local modules; see `products/notebook/` and `docs/EVIDENCE-002.md`. This proposal
remains the broader design, not documentation of the exact installed API. Execution,
renderers and packaging remain unimplemented. It does not change the normative guide.

## Scope and assumptions

For this exploration, Notebook provides private notes: create, find/read, archive.
Title and body are required, matching the current shape specimen. A note has one
owner, assigned from the authenticated actor, and active/archived state. Archiving
does not delete it; owners can still read archived notes. There is no edit, sharing,
deletion or offline write capability. These are specimen boundaries, not SDK defaults.

One central controller persists notes in PostgreSQL. Web, iOS and CLI are remote
clients. Installing the CLI does not install a second database or grant local write
authority. Login uses a deployment-bound trusted identity provider; credentials
are not product input. Authentication screens and provider mechanics are not
invented by this specimen. A deployable release still requires real bindings and
evidence for them.

## 1. Product author: facts and ownership

`product/note.ts`

```ts
import {
  actor, enumeration, equals, objectType, ownershipPolicy, principal, text,
} from "@desert/contracts";

export const Note = objectType({
  id: "notebook.note",
  facts: {
    title: text({ minLength: 1 }),
    body: text({ minLength: 1 }),
    owner: principal(),
    state: enumeration(["active", "archived"]),
  },
});

export const OnlyOwnerCanAccess = ownershipPolicy({
  object: Note,
  allow: equals(Note.owner, actor.id),
  appliesTo: ["create", "read", "change"],
});
```

Identity and revision are standard object metadata, not duplicated facts. On create,
the policy checks the proposed record; on reads and changes, the stored record.
Collection reads must enforce the same policy before exposing rows, counts or
pagination metadata. An absent or unreadable subject has a non-disclosing outcome.
The authenticated actor is supplied by the trusted boundary, never by client input.

## 2. Product author: reads and effects

`product/operations.ts`

```ts
import {
  actor, assign, command, create, equals, input, inputFrom,
  literal, query, subject,
} from "@desert/contracts";
import { Note } from "./note.ts";

export const FindNotes = query({
  id: "notebook.find-notes",
  collection: Note,
  project: [Note.title, Note.state],
  orderBy: "identity",
});

export const GetNote = query({
  id: "notebook.get-note",
  subject: Note,
  project: [Note.title, Note.body, Note.state],
});

export const CreateNoteRecord = command({
  id: "notebook.create-note",
  input: inputFrom(Note, [Note.title, Note.body]),
  effect: create(Note, {
    title: input.title,
    body: input.body,
    owner: actor.id,
    state: literal("active"),
  }),
});

export const ArchiveNoteRecord = command({
  id: "notebook.archive-note",
  subject: Note,
  requires: equals(subject.state, literal("active")),
  effect: assign(subject, { state: literal("archived") }),
});
```

The compiler resolves these typed expressions, not arbitrary JavaScript callbacks.
Both queries and both effects inherit the registered object policy. Neither input
schema admits an owner or state override. The create effect is the single source
for initial state and owner assignment; there is no second database default.
The archive precondition is evaluated at preparation and again transactionally at
acceptance. All mutation entry points require the admitted journey execution profile
below; exporting a command symbol does not expose a direct ungoverned write API.

## 3. Product author: journeys

`product/journeys.ts`

```ts
import { mutationJourney, selectionJourney } from "@desert/contracts";
import { Note } from "./note.ts";
import {
  ArchiveNoteRecord, CreateNoteRecord, FindNotes, GetNote,
} from "./operations.ts";

export const CreateNote = mutationJourney({
  id: "notebook.create",
  command: CreateNoteRecord,
  confirmation: "review-prepared-effect",
  outcome: "durable-receipt",
});

export const ReadNote = selectionJourney({
  id: "notebook.read",
  choices: FindNotes,
  selected: GetNote,
  empty: "empty-collection",
});

export const ArchiveNote = mutationJourney({
  id: "notebook.archive",
  subject: Note,
  context: GetNote,
  command: ArchiveNoteRecord,
  confirmation: "review-prepared-effect",
  outcome: "durable-receipt",
});
```

These are finite journey families with defined semantics, not three names for
unrestricted handlers. A mutation run collects the referenced input, prepares an
exact effect under current policy, obtains confirmation bound to that preparation,
and attempts acceptance. A read run lists permitted notes, accepts a selection and
reads it under fresh authority; it also supports entry with a known subject without
requiring a redundant selection. Confirmation is an explicit intent act, not proof
that a human understood the content, nor authority granted by the renderer.

The core execution profile must enforce run identity, actor/scope, allowed command
occurrence, immutable preparation identity, expiry and revision checks, idempotency,
atomic policy/effect/receipt acceptance, and recovery of uncertain outcomes. These
guarantees require mechanisms and real evidence; the declarations do not provide them.

## 4. Product author: one human interaction contract

`product/interactions.ts`

```ts
import { agentSurface, humanSurface } from "@desert/contracts";
import { CanonicalHumanInteraction } from "@desert/human-contracts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";
import { Note } from "./note.ts";

export const HumanNotebook = humanSurface({
  id: "notebook.human",
  profile: CanonicalHumanInteraction,
  journeys: [CreateNote, ReadNote, ArchiveNote],
  identity: { object: Note, label: Note.title, secondary: Note.state },
  navigation: {
    entry: ReadNote,
    primaryAction: CreateNote,
    subjectActions: [ArchiveNote],
  },
  language: {
    locale: "en",
    object: { reference: Note, singular: "Note", plural: "Notes" },
    fields: [
      { reference: Note.title, label: "Title" },
      { reference: Note.body, label: "Content" },
      { reference: Note.state, label: "Status" },
    ],
    journeys: [
      { reference: CreateNote, label: "Create note" },
      { reference: ReadNote, label: "Read notes" },
      { reference: ArchiveNote, label: "Archive note" },
    ],
  },
  connection: {
    disconnectedReads: "unavailable",
    draftRetention: "session-memory",
    reconnect: "refresh-offers-without-replaying-writes",
  },
});

export const AgentNotebook = agentSurface({
  id: "notebook.agent",
  journeys: [CreateNote, ReadNote, ArchiveNote],
});
```

The human profile owns shared interaction grammar, required markers, focus and
validation semantics, confirmation, canonical outcome/error language, and feedback
obligations. Product labels above are authored once. No renderer invents extra
product instructions, limits, claims, layouts or confirmation bypasses. Missing
language coverage or unsupported interaction semantics is a compile-time gap.

Web, iOS and terminal share this exact contract. Terminal can use prompts and a
text review where graphical realizations use registered fields and review surfaces.
Required meaning remains textual/accessible even without color. Keyboards do not
need touch haptics, but a renderer must preserve the feedback intent and relevant
accessibility obligations. A terminal renderer lacking an obligation is unsupported,
not permitted to silently omit it. This is semantic parity, not identical geometry.

The specimen has no offline read cache. While disconnected, the shell and in-memory
draft remain; remote reads/writes become unavailable without waiting for navigation.
On session change/sign-out, private content and drafts are cleared. Reconnection
refreshes authority and retrieves pending receipts without silently issuing a new
command. Hiding an offer is not a security boundary; the controller still enforces it.

## 5. Product author: compose the product

`product/product.ts`

```ts
import { product } from "@desert/contracts";
import { AuthoritativeJourneys } from "@desert/execution-contracts";
import { Note, OnlyOwnerCanAccess } from "./note.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";
import { AgentNotebook, HumanNotebook } from "./interactions.ts";

export const Notebook = product({
  id: "notebook",
  version: "0.1.0",
  objects: [Note],
  policies: [OnlyOwnerCanAccess],
  journeys: [CreateNote, ReadNote, ArchiveNote],
  surfaces: [HumanNotebook, AgentNotebook],
  execution: AuthoritativeJourneys,
});
```

Operations are reachable through typed journey references; no second list of routes
or input types is needed. A product release defines meaning; it is not a deployment.

## 6. Release author: distributions, not new products

`release/distributions.ts`

```ts
import { clientDistribution, controllerDistribution } from "@desert/build";
import { NodeController, PostgreSQLStore } from "@desert/server";
import { SvelteWeb, SwiftUIIOS, TerminalCLI } from "@desert/renderers";
import { Notebook } from "../product/product.ts";
import { AgentNotebook, HumanNotebook } from "../product/interactions.ts";

export const NotebookService = controllerDistribution({
  id: "notebook.service",
  product: Notebook,
  runtime: NodeController,
  storage: PostgreSQLStore,
  serves: [HumanNotebook, AgentNotebook],
});

export const NotebookWeb = clientDistribution({
  id: "notebook.web",
  product: Notebook,
  surface: HumanNotebook,
  renderer: SvelteWeb,
  controller: NotebookService,
});

export const NotebookIOS = clientDistribution({
  id: "notebook.ios",
  product: Notebook,
  surface: HumanNotebook,
  renderer: SwiftUIIOS,
  controller: NotebookService,
});

export const NotebookCLI = clientDistribution({
  id: "notebook.cli",
  product: Notebook,
  surface: HumanNotebook,
  renderer: TerminalCLI,
  controller: NotebookService,
});
```

The terminal is a human surface realization inside the CLI distribution. The
service exposes the separate agent protocol. A future noninteractive CLI entry
would need an explicit binding to that surface; `--yes` must not become a hidden
way around preparation, authority or intent confirmation. Physical packaging may
combine several realizations without merging their contracts.

The renderer packages above are proposed mechanisms, not available dependencies.
The target platform is declared by each installed renderer's verified manifest,
not independently repeated in the distribution. The builder must check that manifest
against the host, interaction obligations, protocol and installed implementation.

## 7. Build operator: compile, build, bind

`release/build.ts`

```ts
import { desert, type CapabilityCatalog } from "@desert/sdk";
import { Notebook } from "../product/product.ts";
import {
  NotebookCLI, NotebookIOS, NotebookService, NotebookWeb,
} from "./distributions.ts";

export function buildNotebook(installedCapabilities: CapabilityCatalog) {
  const application = desert.compile(Notebook, installedCapabilities);

  return desert.build(application, {
    distributions: [
      NotebookService, NotebookWeb, NotebookIOS, NotebookCLI,
    ],
  });
}
```

The catalog represents installed implementations and their exact provenance, not
strings asserted by the product. Compilation derives obligations and diagnoses gaps.
Build refuses unsupported realizations; it does not return an installable app merely
because its renderer was named. iOS packaging/signing requires the appropriate
platform tools and separately authorized signing material.

Deployment then binds the service's database and trusted identity provider, and each
client's authenticated service connection, to actual environments. Values such as
URLs, credentials, certificates and database locations are deployment inputs, not
product facts. Client bundles never contain database credentials or controller
policy internals. No deployment or provider choice is performed by this proposal.

## 8. What DESERT derives, versus what its maintainers implement

| Source authored once | Derived artifact | Required mechanism, not generated magic |
| --- | --- | --- |
| Note facts and command references | Canonical input schemas, TS/Swift bindings, field constraints | Schema compiler and equivalent platform validators |
| Ownership policy | Scoped read/change plans and eligibility dependencies | Trusted identity, policy evaluator, protected storage |
| Commands and journey families | Admissible graph, prepared-effect and receipt codecs | Run admission, transactional executor, idempotency/recovery |
| HumanNotebook | Web/native/terminal interaction plans | Conforming renderers, device/host adapters |
| AgentNotebook | Typed journey protocol descriptions | Protocol server/client implementation |
| Distribution definitions | Exact dependency lock and build manifest | Platform builders, packaging and verification |

Generated client artifacts contain authorized projections and public interaction
metadata, not the complete server contract. Permission-dependent data is obtained
under the current session. Local validation answers whether a draft has the right
shape; it cannot establish permission or guarantee acceptance.

Changing a renderer does not rewrite the product. Changing a required field updates
the command input and all projections; it does not automatically migrate stored
data. A breaking change still needs a migration and compatibility decision.

Each distribution can have independent releases, but pins the exact product,
interaction/protocol contracts and mechanisms it consumes. A new CLI rendering fix
need not change the product version. Cross-version execution requires demonstrated
compatibility; matching names or major versions is not evidence. Contract digests
identify content, not authenticity or authorization.

## 9. Independent acceptance cases to implement

These are expectations for future tests, not generated passing tests or completed
verification. The specimen must be exercised through actual built entry points.

1. Alice creates a note through web; Alice can read the same note through iOS and
   terminal. Bob cannot list, count, read or archive it through any surface.
2. Empty title/body is invalid everywhere; owner/state injection is rejected.
   Changing only the title constraint changes every surface and server validator.
3. Web/iOS/terminal all collect the same input, review the same prepared effect,
   require explicit confirmation, and render the correlated durable result.
4. Terminal-only creation does not load Svelte, require a browser or bypass a run.
5. Direct, expired, wrong-actor, wrong-occurrence and changed-preparation writes
   produce no effects. A stale archive cannot overwrite a newer state.
6. A lost acceptance response is reconciled by the original operation identity;
   resubmission with that identity cannot duplicate a note. Reconnect creates no
   new operation automatically. Transaction rollback leaves neither effect nor receipt.
7. Archive remains readable and cannot be archived again under a fresh intent;
   retry of the original accepted intent returns its existing receipt.
8. Disconnect updates the current surface immediately, retains the permitted draft,
   and disables remote actions. Reconnect refreshes offers; sign-out clears private
   state. No renderer claims native haptics on an unsupported device.
9. Missing renderer capability fails build. An old client with an incompatible
   protocol gets an explicit compatibility outcome, never silent reinterpretation.
10. Verify real PostgreSQL concurrency and actual web/terminal/device behavior.
    A compiler test alone does not establish any of these integration guarantees.

## Architectural finding

Keep the four nouns distinct: product meaning, interaction surface, delivered
distribution, and configured installation/deployment. The terminal addition tests
that the human contract is not a disguised web layout. It does not require deciding
Capacitor now, building a deployment platform, or promising universal rendering.
