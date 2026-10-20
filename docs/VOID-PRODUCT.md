# VOID product definition

VOID is the intended open-source example product for DESERT: a collaborative operating system where human and agent identities use the same journeys. It replaces Landmarks as the product direction while retaining reusable media and interaction work. VOID has no built-in intelligence; it organizes typed information, collaboration, resources and execution without choosing an intelligence provider.

This definition records the owner's product intent from 2026-10-16. It is not an executable contract, a delivery claim or approval of the unresolved choices below. Current installed DESERT capabilities remain recorded in [Implementation status](STATUS.md). A missing mechanism is a gap to close, not permission to shrink VOID into what the SDK already supports.

## Product boundaries

- The system contains Notes, Tasks, Communicator and Library. Settings is a system destination; whether it is presented as a separate program remains open.
- Connections expose execution environments and their resources. They are system connections, not another work program. Tasks absorbs the earlier separate work and workflow concepts.
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

A task can stand alone or belong to a project. A project groups tasks; it is not a prerequisite to asking for work. The Tasks home shows the current identity's pending tasks ordered by attention, its projects and relevant task context. The attention ordering must be explicit and deterministic, not an intelligence feature.

Each task has an owner and an assigned actor, a title, description, state, optional project, deadline, reminders and a label drawn from a catalog, such as Urgent. Creating a task from a description generates its title automatically and deterministically, without a model or a second intelligence system. The exact title rule and attention ordering are unresolved, rather than hidden heuristics.

The actor selector offers system identities, current available actor sessions and the option to create a session. Examples are the requesting identity, an identity named Abed, or a Claude Code, Codex, Kenon or VOID session on a named connected machine. Provider and machine labels explain where execution lives; they do not create a new identity kind or grant authority.

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

## Connections and actor sessions

A connection represents a machine running VOID's local resources controller and pointed at a VOID controller. It publishes resources actually available there, including authorized filesystem access, shell commands and installed execution providers. A friendly product name for an execution environment remains open.

The local resources controller is not a durable agent identity and is not an intelligence or memory system. It manages provider sessions, relays messages, observes availability, attempts recovery, and supports pause and abort. Providers such as Claude Code, Codex or Kenon own their session memory and provider-specific continuation. The local resources controller must not manufacture or rewrite that memory.

An actor session is one provider session on a connection, not merely the provider executable. Sessions appear in the connection's actor list and the task actor selector. Named retained sessions and available unnamed sessions are both discoverable. A user can elect to retain and name a session; retention is off by default. The precise end-of-life rule for an unretained session is still open: default non-retention must not silently contradict the requirement that task completion does not close it automatically.

An unavailable machine or missing CLI makes its actor unavailable. Requested recovery or migration must be honest about provider capabilities: moving work to another actor is not proof that provider memory or an interrupted operation was transferred. The product needs a migration path when an actor cannot recover; continuity, consent and unsupported-provider behavior need explicit decisions.

Assignments do not implicitly delegate all of an owner's permissions. Before implementation, the contract must identify whose authority a provider session uses, what the actor may access, and how that authority is revoked. Availability is evidence of resources, not permission to run a shell command.

## CLI and instance administration

Installing the single VOID CLI on a machine allows the user to opt into exposing local resources by enabling its local resources controller, independently of whether a VOID instance is hosted on that machine. The local resources controller always targets a chosen VOID endpoint, including when both run on the same machine. Remote and colocated deployments follow the same relationship.

The CLI must support initializing and deleting a VOID instance. The system's instance administration menu, provisionally called the BIOS, also has a nonterminal surface in the same distribution. This is product terminology, not a claim that a firmware or hardware boot implementation exists. Which hosts that administration surface can run on remains an architectural decision.

Deleting a VOID instance and deleting an identity are separate destructive journeys with different scopes. Neither may be inferred from closing a session, disconnecting a machine or uninstalling a client. Instance selection, confirmation, backup and recovery requirements must be resolved before destructive execution is enabled.

## Identity deletion and data disposition

Only an admin can delete an identity, and every deletion requires a choice about its data: discard it or integrate it into another identity. There is no silent default that loses data. Integration is intended to preserve data rather than leave it orphaned; discard is an explicit destructive choice.

Object references to the deleted identity must remain meaningful. The requested tombstone retains its recognizable appearance and deleted status while removing the content selected for deletion. Its old credentials must no longer act as that identity. Exact retained name/avatar fields, attribution, membership and ownership consequences need a defined retention policy.

“Its data” is not yet sufficiently precise for a collaborative system. Shared notes, messages authored in another identity's conversation, project ownership, media participants and task assignments need explicit disposition rules. Integration must not silently rewrite historical authorship or widen access. These are pending semantics, not assumed behavior.

## Presentation and readable composition

The visual direction is Apple Settings and functional Glass on the shared shadcn-svelte foundation, preserving DESERT's whole-well inputs. The same typed bank serves product and catalog; native renderers will use platform-native libraries later, without changing the product meaning.

VOID's name and eventual logo belong in the shared sidebar header. The sidebar toggle is a compact ghost action at the bottom. Fresh identity and branding options are being considered; **no final logo has been selected**. A provisional preview is not brand adoption.

Retain the agreed adaptive toolbar and search behavior: compact actions and search below content, search expanding across the available toolbar with only its close action, and all search states on the continuous Glass overlay. System motion, contrast and transparency preferences remain authoritative.

Keep definitions small enough for the owner to read as the work proceeds. DRY means one owner for each rule, not compressed code or a universal object that hides domain meaning. Reuse identity references, participation, labels, conversations, grouping, availability and admitted operation lifecycles only where their semantics match. Projects, albums, conversations and connections must not become interchangeable merely to reduce a type count.

## Typed flow and encryption

VOID's information travels through a typed flow and encrypted ZIP packaging is part of the requested direction. Compression, encryption, authentication and authorization are different guarantees. The product must specify what is packaged, who can decrypt it, integrity and replay protection, and the boundaries between portable artifacts, runtime data and secrets.

**The encryption trust model is unresolved:** controller-readable protected storage/transport and participant-only end-to-end encryption have different consequences for collaboration, search, recovery, recommendations, remote actors and administration. Neither model is approved by this definition. No credentials or private user data may be included merely because a bundle is called encrypted.

## Decisions required before dependent implementation

1. Does admin authority include private content, or only system and identity administration? This must agree with privacy, deletion and integration.
2. Who can decrypt content: the controller, or only participating identities? Define key ownership, device enrollment, recovery and access removal accordingly.
3. Which participation roles are needed, and who may invite, remove or change another participant? Determine task and project visibility rather than assuming Notes' rules apply unchanged.
4. What does identity discard or integration do to shared content, ownership, historical attribution, grants and retained tombstone appearance? Define the last-admin and self-deletion cases.
5. Which identity authorizes a provider session, what delegated scope can it use, and who may expose a machine's filesystem and shell? Specify paths, capabilities, credential storage and revocation.
6. When do unretained sessions end, how are tasks serialized or shared within one session, and what does migration preserve when a provider cannot export session state?
7. Define task states, dependency predicates, attention order, deterministic titles, reminder delivery and failure/retry rules. Decide whether an unavailable actor waits, asks for reassignment or follows another explicit policy.
8. Define collaborative edit semantics, reconnect/offline behavior and retention; define Library quotas, accepted media, upload interruption/recovery, sharing inheritance and deterministic recommendation criteria.
9. Decide Settings' presentation, the friendly connection name, the final brand, and the instance administration lifecycle. None of these choices may imply a security policy by label alone.

## Proposed delivery sequence

This sequence is a proposal, not a reduction of the requested product or a claim of current support.

1. Resolve the authority and encryption boundaries; define identity, participants and exact cross-surface journey obligations with independent positive and negative expectations.
2. Build one complete Notes collaboration slice with optional titles, labels, participants, durable edits, concurrent behavior and recovery through web, MCP and API. Extend DESERT for missing semantics instead of duplicating product logic.
3. Add Tasks and Communicator using shared participation and conversation mechanisms; prove standalone tasks, projects, state dependencies, reminders and deterministic derivations before provider execution.
4. Install Connections and provider-session execution with scoped authority, explicit lifecycle, relay, recovery and supported migration. Verify external effects and uncertain outcomes separately from local acceptance.
5. Add Library's real bucket, metadata, upload queue and playback, then deterministic recommendations. Reuse media presentation without pretending a read-only catalog is storage.
6. Complete identity deletion/integration and instance administration with destructive-operation recovery tests; package the same distribution and reconcile all declared journeys against every installed surface before claiming full coverage.

At every step, show the readable authored product definitions, separate installed capability from gaps, and retain the existing controller and data until an explicit compatible migration is designed. Renaming the example to VOID alone does not implement this operating system.
