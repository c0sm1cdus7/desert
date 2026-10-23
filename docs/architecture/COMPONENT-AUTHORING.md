# Typed component authoring

Product Views are built from the SDK's `Components` object and finalized by
`defineView`. Authors choose a semantic View name, typed input/output references,
content and supported docks. They do not assign renderer node IDs, component-key
strings, versions, styles, HTML or callbacks.

```ts
import { Components, defineView, viewPorts } from "desert-sdk/src/index.ts";

const Ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["select"] });

export const NotesView = defineView({
  name: "notes",
  outputs: Ports.outputs,
  content: [
    Components.Header({ title: "Notes", subtitle: "Your private notes." }),
    Components.Stack({ title: "All notes", items: [
      Components.Collection({ input: Ports.inputs.notes, output: Ports.output.select }),
    ] }),
  ],
});
```

The result is a frozen typed View object. Journeys reference that object; public
module consumers reference the issued View catalog entry. `name` identifies the
definition once. It is not a duplicated lookup key in its consumers.

## One grammar, not a second bank

`src/views/schema.ts` is the canonical component data grammar. Constructor
properties derive from those types and are validated against those same schemas.
`src/views/components.ts` exports the supported authoring constructors. Renderers
continue consuming the canonical View program and their existing closed catalog;
this authoring layer neither draws nor introduces alternate visual implementations.

The current constructors are Header, Stack, Text, Fact, Tag, Image, Avatar,
Collection, Form, Context, MediaLibrary, VisualCatalog, Appearance, SystemStatus, Navigation,
Destination, Toolbar and Dock. `ViewTitles.product`, `.subject` and `.operation`
publish explicit title bindings without requiring a handwritten discriminator.

The catalog enforces the installed composition grammar. Headers are independent
content, not Stack children. Stacks require a title and accept installed leaf
content. Toolbars contain semantic actions; they do not acquire styling authority.
Unsupported layouts still fail program admission. An available constructor does
not promise an unimplemented execution or placement mechanism.

## Internal identities and admission

`defineView` assigns deterministic content paths such as `content.0` and
`content.1.items.0`. Reusing a component in separate positions produces independent
node identities. No global counter, label hashing or random ordering is involved.
Reordering the declared content intentionally changes those internal paths; they
are not persistent business identities or references for consumers to store.

Component constructors issue immutable values. `defineView` refuses fabricated
wire descriptors. Module and product registration both require the exact issued
View, before lowering references or serializing. A matching object literal,
spread or `structuredClone` does not bypass that admission. Existing module
ownership and public-reference checks still apply after construction.

The source gate admits only direct calls to the actual SDK `Components` catalog
and derives its method inventory from that object. A similarly named local
object, a copied constructor, computed property invocation or function-helper
invocation does not become an approved authoring constructor.

The wire grammar remains independently decodable and validated for renderer
protocols and tests. Wire data is not thereby an authored registration. This
distinction does not establish identity, permissions or command authority.

## Verification

Independent tests cover constructor properties, canonical composition failures,
unregistered/forged data, source provenance, immutability, deterministic IDs,
exact output and View-reference inference, and module/root registration closure.
The authoring migration changes generated content identities, not component
geometry, materials or motion. Full product browser evidence belongs to the
artifact built from the combined product and SDK revision.
