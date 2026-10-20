# VOID product definition

VOID is the intended open-source example product for DESERT: a collaborative operating system where human and agent identities use the same journeys. It replaces Landmarks as the product direction while retaining reusable media and interaction work. VOID has no built-in intelligence; it organizes typed information, collaboration, resources and execution without choosing an intelligence provider.

This definition records product intent from 2026-10-16, updated by the owner's
2026-10-20 direction. VOID starts from zero as a separate MIT-licensed product in
[c0sm1cdus7/void](https://github.com/c0sm1cdus7/void), consuming DESERT rather than
copying its implementation. The current delivery task and acceptance cases live
in that repository's `docs/ROADMAP.md` and `docs/NOTES-VERTICAL.md`.
This is not a delivery claim or approval of the unresolved choices below.
Current installed capabilities remain in [Implementation status](STATUS.md).
A missing mechanism is a gap to close, not permission to shrink VOID.

The local N1 web slice now runs Home, Notes and Visual catalog from a typed
`ViewProgram`, using the SDK renderer, canonical create/read journeys and a
persistent developer host. The editor/detail adapt between a right dock and
transient presentation. This is not production identity onboarding, editing,
native delivery or the complete module architecture; see the VOID repository's
`docs/VERIFICATION.md` for the tested scope and outstanding suite failures.

## Product boundaries

- The active delivery order is Notes, System, Appearance, User, Connections,
  Environments, then Tasks. Communicator and Library remain outside this sequence;
  their earlier requirements below are not silently removed or implemented.
- Connections provision external tools/services (GitHub, Resend, Railway, Apple
  Developer). Environments expose execution hosts and their available actors.
  Tasks absorbs the earlier separate work and workflow concepts.
- Filesystem and storage belong to the kernel. There is no Filesystem program. Initially only Library writes to the system media bucket.
- The same VOID distribution provides its terminal CLI, instance administration and system access. Running a VOID instance and exposing a machine's local resources are independent choices.
- DESERT owns common semantics and installed surface mechanisms. VOID owns its product policy, objects and journeys. No app-specific parallel renderer or duplicated validator is an acceptable shortcut.

## Identity and authority

Every durable identity has a descriptive `kind` of `human` or `agent`. Permissions attach to the identity, never to its kind. An agent identity presents the connection information needed to join through MCP, then participates in VOID like any other identity. Connection presentation must not put credentials into readable app metadata, browser bundles or exported product artifacts.

Human, MCP and API surfaces must provide complete coverage of the same product journeys under the same authority and lifecycle rules. The required coverage is 100 percent of declared applicable journeys, not a separate privileged agent path or an equal number of controls. Denial, unavailable resources, invalid input and recovery are part of the parity obligation. A change of identity kind alone must not grant or remove permission.

Administration is intentionally concise: an admin manages identities and system settings; other identities edit their own identity settings. Only an admin creates identities, pauses access or deletes identities. The owner's phrase “admin edits everything” does **not yet settle whether admin authority includes reading and editing private content**; that boundary is pending an explicit answer.

Identity settings cover sign-in, avatar, display name and system appearance. Agents need an equivalent authorized way to manage their applicable settings. Authentication method, credential issuance, rotation, recovery and delegation are not defined by the descriptive kind.

## Shared collaboration model

Objects are private by default where specified below, but privacy does not mean single-person editing. The owner adds participants from an object's settings. This should be the recurring collaboration pattern across the system rather than separate sharing implementations for every app.

Real-time collaboration is a product requirement, not just periodically refreshed lists. Notes explicitly require concurrent editing comparable in intent to Google Sheets or Figma. Participant access, visibility and updates must agree across surfaces. Removal of a participant must take effect at the authority boundary, not merely hide a control.

Ownership, participation and authorship remain distinct. An object reference is not a permission grant. Shared mechanisms may serve several apps without erasing the different meaning of a note, a task response, a direct conversation or a media item.

## Notes

- Create and edit notes with or without a title. Do not require a fabricated title to fit the current Notebook schema.
- Apply labels with text and color.
- Keep a note private initially; manage its participants in its settings.
- Allow authorized participants to edit the same note in real time, including human and agent identities through their surfaces.
- Preserve the note and its collaboration history independently of whether a participant is currently connected. Exact history and retention behavior still need definition.

## Tasks

A task can stand alone or carry project labels. The 2026-10-20 direction treats
projects as labels, not required containers or a separate permission/lifecycle
domain. Single versus multiple project labels remains open. Attention ordering
must be explicit and deterministic, not an intelligence feature.

Each task has an owner and an assigned actor, a title, description, state,
optional project labeling, deadline, reminders and other catalog labels such as
Urgent. Creating a task from a description generates its title automatically and
deterministically, without a model or a second intelligence system. The exact
title rule and attention ordering are unresolved, rather than hidden heuristics.

The actor selector offers available environment-bound actors, not global provider
names or a workflow to create/manage provider sessions. "Claude — MacBook Pro"
and "Codex — Linux VM on Railway" identify different execution actors. An actor
has an environment; display labels do not establish identity or authority.

Tasks can depend on other tasks' states. Dependencies do not consume another task's result as a workflow input. This supports workflows directly in Tasks without a separate workflow program. The exact states, dependency predicates, cycles, reopening behavior and scheduling rules require definition.

A task retains its response and supports an ongoing conversation about the task, like a small thread. Conversation and response remain task context rather than a detached chat result. A session may work on multiple tasks; finishing one task must not automatically close that session. Assignment, starting execution and accepting an outcome must remain distinguishable operations when their authority or effects differ.

## Communicator

Communicator provides conversations between identities in the system. A conversation is not itself a task, and a task thread remains attached to its task. Shared message and participant mechanisms should be reused where their semantics actually match. Direct versus group conversation creation, membership changes, message editing and retention remain to be specified.

## Library and storage

Library is a full media program for user-provided local files: photos, videos, music and movies. Its experience combines image viewing, music listening and movie playback, with usable empty states when there is no content. There are no third-party streaming-service catalogs or subscriptions implied by this product.

Files are stored in a system bucket with metadata. They are grouped, not organized into user-created filesystem folders. The requested presentations are Albums for photos and videos, Music and Movies. The precise distinction between an item's media kind and a collection's kind must remain explicit in the eventual contract.

Library is private by default. Content can be shared with every system identity or with selected identities. It provides file upload and management, an upload queue and visible progress. Playback reads the stored files; a remote VOID's delivery of those files does not turn Library into an external streaming-provider product.

Music and movies include recommendations, but VOID itself has no intelligence. Recommendations therefore need transparent, deterministic criteria based on available metadata or activity, unless the owner later approves a different requirement. The criteria and required metadata are not chosen here.

Reuse the earlier Landmarks media presentation and shared mechanisms where applicable. This is not authorization to redistribute Apple sample media or assume rights to third-party assets in an open-source distribution.

## Connections, environments and actors

Connections provision authorized access to external tools/services. Environments
are hosts running VOID CLI and connected to VOID. A Railway connection may
provision a Linux environment; the connection and environment remain distinct.

VOID CLI bridges installed Kenon, Claude and Codex CLIs, advertises their observed
availability, relays task conversations and queues jobs. It enforces a configurable
maximum concurrent workload per actor, not per global provider name.
The actor is an environment-bound identity; provider sessions are implementation
lifecycle, not a separate user-managed actor program.

Provider memory/continuation remain provider-owned. Task completion does not
implicitly destroy context. Queue durability, acknowledgement, cancellation,
retry, offline behavior, changing limits and uncertain outcomes need explicit
contracts. No FIFO or automatic replay policy is inferred from "queue".

An unavailable environment or missing CLI makes its actor unavailable. Moving
work does not prove that provider memory or an interrupted operation transferred.
Assignments do not delegate all owner permissions. Enrollment, actor identity,
scoped execution, connection credentials and revocation require separate authority.

## CLI and instance administration

Installing the single VOID CLI on a machine allows the user to opt into exposing local resources by enabling its local resources controller, independently of whether a VOID instance is hosted on that machine. The local resources controller always targets a chosen VOID endpoint, including when both run on the same machine. Remote and colocated deployments follow the same relationship.

The CLI must support initializing and deleting a VOID instance. The system's instance administration menu, provisionally called the BIOS, also has a nonterminal surface in the same distribution. This is product terminology, not a claim that a firmware or hardware boot implementation exists. Which hosts that administration surface can run on remains an architectural decision.

Deleting a VOID instance and deleting an identity are separate destructive journeys with different scopes. Neither may be inferred from closing a session, disconnecting a machine or uninstalling a client. Instance selection, confirmation, backup and recovery requirements must be resolved before destructive execution is enabled.

## Identity deletion and data disposition

Only an admin can delete an identity, and every deletion requires a choice about its data: discard it or integrate it into another identity. There is no silent default that loses data. Integration is intended to preserve data rather than leave it orphaned; discard is an explicit destructive choice.

Object references to the deleted identity must remain meaningful. The requested tombstone retains its recognizable appearance and deleted status while removing the content selected for deletion. Its old credentials must no longer act as that identity. Exact retained name/avatar fields, attribution, membership and ownership consequences need a defined retention policy.

“Its data” is not yet sufficiently precise for a collaborative system. Shared
notes, messages authored in another identity's conversation, task ownership,
project labels, media participants and task assignments need explicit disposition
rules. Integration must not silently rewrite historical authorship or widen access.
These are pending semantics, not assumed behavior.

## Presentation and readable composition

The visual direction is Apple Settings and functional Glass on the shared
shadcn-svelte foundation, preserving DESERT's whole-well inputs. The Component
bank becomes VOID's **Visual catalog** destination, declared in
`views/visualCatalog.view.ts`, and demonstrates the web surface's actual catalog.
It is not the entire portable SDK bank. Native renderers use their own qualified
libraries without changing journey meaning.

Reusable definitions live in `views/*.view.ts`; activities in
`journeys/*.journey.ts`. Views cannot draw or reference their consuming journeys.
Journeys bind typed outputs, commands and destinations. The storyboard derives
from these contracts, never a second manually authored flow.

VOID's name and eventual logo belong in the shared sidebar header. The sidebar toggle is a compact ghost action at the bottom. Fresh identity and branding options are being considered; **no final logo has been selected**. A provisional preview is not brand adoption.

Retain the agreed adaptive toolbar and search behavior: compact actions and search below content, search expanding across the available toolbar with only its close action, and all search states on the continuous Glass overlay. System motion, contrast and transparency preferences remain authoritative.

Keep definitions small enough for the owner to read as the work proceeds. DRY means one owner for each rule, not compressed code or a universal object that hides domain meaning. Reuse identity references, participation, labels, conversations, grouping, availability and admitted operation lifecycles only where their semantics match. Projects, albums, conversations and connections must not become interchangeable merely to reduce a type count.

## Typed flow and encryption

VOID's information travels through a typed flow and encrypted ZIP packaging is part of the requested direction. Compression, encryption, authentication and authorization are different guarantees. The product must specify what is packaged, who can decrypt it, integrity and replay protection, and the boundaries between portable artifacts, runtime data and secrets.

**The encryption trust model is unresolved:** controller-readable protected storage/transport and participant-only end-to-end encryption have different consequences for collaboration, search, recovery, recommendations, remote actors and administration. Neither model is approved by this definition. No credentials or private user data may be included merely because a bundle is called encrypted.

## Decisions required before dependent implementation

1. Does admin authority include private content, or only system and identity administration? This must agree with privacy, deletion and integration.
2. Who can decrypt content: the controller, or only participating identities? Define key ownership, device enrollment, recovery and access removal accordingly.
3. Which participation roles are needed, and who may invite, remove or change
   another participant? Determine task visibility and project-label semantics
   rather than assuming Notes' rules apply unchanged.
4. What does identity discard or integration do to shared content, ownership, historical attribution, grants and retained tombstone appearance? Define the last-admin and self-deletion cases.
5. Which identity authorizes a provider session, what delegated scope can it use, and who may expose a machine's filesystem and shell? Specify paths, capabilities, credential storage and revocation.
6. Define internal provider-session lifecycle, per-actor queue policy, durable
   acknowledgement, concurrency limits, offline recovery and migration continuity.
7. Define task states, dependency predicates, attention order, deterministic titles, reminder delivery and failure/retry rules. Decide whether an unavailable actor waits, asks for reassignment or follows another explicit policy.
8. Define collaborative edit semantics, reconnect/offline behavior and retention; define Library quotas, accepted media, upload interruption/recovery, sharing inheritance and deterministic recommendation criteria.
9. Decide System's navigation nesting, the final brand and instance administration
   lifecycle. These choices cannot imply a security policy by label alone.

## Proposed delivery sequence

The owner's 2026-10-20 sequence supersedes the earlier proposed order: Notes →
System → Appearance → User → Connections → Environments → Tasks. Start with
an isolated create/read runtime proof, then install the closed views/journeys
boundary and safe edit-base semantics in DESERT before declaring Notes complete.
Full Notes still requires collaboration, participation and actual MCP/API parity.

Work in branches in both repositories. VOID main pushes are the intended release
boundary for one version across iOS, Android, Linux and Web, with equivalent
journey behavior. Native builders and the release pipeline are not yet installed.
Public community buildability requires a reviewed licensed SDK distribution;
VOID's MIT license does not relicense this private SDK or third-party assets.

Retain existing controllers, data and `v127a-stable`. No live provider enrollment,
cloud spending, store submission or disclosure of private SDK material is implied.
