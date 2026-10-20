# Reference stack — 2026-10-15

## Accepted owner decision

The owner explicitly selected TypeScript, Node.js, PostgreSQL and Svelte/SvelteKit.
DESERT is the SDK; TPA is its architecture and semantic contract language.
This is a new implementation, not a migration or copy of the previous SDK.

- TypeScript: product authoring, compiler and controller implementation.
- Node.js: initial authoritative runtime host; not a client requirement.
- PostgreSQL: first durable storage implementation; transactional guarantees
  must be tested against PostgreSQL, not inferred from an in-memory substitute.
- Svelte: first human renderer; SvelteKit: web host and build integration.
- A shared, versioned protocol connects surfaces to the controller. Surface
  frameworks cannot introduce domain rules, authority or hidden write paths.

An approval of the stack does not assert that any of these integrations exist.
The initial remote-controller topology is not universal. The owner explicitly
requires fully offline products and local controllers, with per-journey dependencies
and availability based on the required controller, not Internet access. The stack
above is the initial reference implementation, not a requirement to embed Node or
PostgreSQL in every client. See [execution dependencies](EXECUTION-DEPENDENCIES.md).
The later owner decision selects shadcn-svelte as the web component foundation.
The presence of other implementation dependencies is not a separate product or
platform capability approval.

## Native surfaces: requirement and implementation direction

The current owner decision requires one typed TypeScript bank consumed by web,
future Swift and future native Android renderers. Each renderer uses its own
platform libraries; UIKit informs interaction review, not the portable grammar.
Future Swift/Kotlin bindings must derive from the canonical exported protocol,
not a second manually maintained model. See the explicit
[native mapping proposal and limits](NATIVE-RENDERER-MAPPING.md).

The earlier Capacitor discussion is historical, not the selected native-widget
direction or an installed capability. A packaged web view cannot be labelled a
Swift/Android-native renderer. Native hosts and widgets remain unimplemented;
visionOS also requires separate interaction/capability work. No quality guarantee
or device/API support follows from a renderer name, package or bridge import.

Native clients must not require SvelteKit server routes or a Node runtime inside
the device. The initial authoritative Node/PostgreSQL runtime is separate from
surface delivery; a different local controller host requires its own installed
execution semantics. Packaging UI does not install that host.

Device capabilities are observed, scoped and fallible. Haptics are complementary,
respect preferences and hardware availability, and never establish business
success. Native packaging does not grant offline write authority or trust.
Authentication, app suspension, secure storage, links, keyboard, safe areas,
accessibility and reconnect behavior need explicit integration tests.

## Sources checked

- https://capacitorjs.com/docs — web-focused native runtime and native bridge.
- https://capacitorjs.com/docs/getting-started/environment-setup — supported targets.
- https://capacitorjs.com/docs/getting-started — bundled web assets and native projects.
- https://capacitorjs.com/docs/apis/haptics — device feedback API and hardware limits.
- https://svelte.dev/docs/kit/adapter-static — static client build option.
- https://developer.android.com/compose — native Kotlin UI toolkit.
- https://developer.apple.com/visionos/ — Apple spatial platform.

## Dependency choices in the first compiler slice

TypeBox describes the bootstrap contract grammar once, producing its runtime
schema and authoring types. Ajv validates that grammar and the generated object
schemas. These are implementation dependencies, not the TPA language itself.
Only trusted build inputs generate schemas; the validator is not an execution
sandbox for hostile JavaScript or arbitrary packages.

The contract digest identifies the shape definition and format, not the entire
build, installed mechanisms, authorization or acceptance. A future assembly lock
must identify those independently. No native implementation should treat a digest
claim received from a peer as proof of origin or authorization.
