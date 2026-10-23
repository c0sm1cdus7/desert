# Stage A baseline at 572b30fa981c8d2a27ce8846740f745bbb2721c8

Recorded 2026-10-23T19:34:20.392Z with node v24.16.0. The gate of each copied tree checks that tree.
Escape cases are expected to be built here; controls are expected to be rejected.

| Id | Kind | Mutation | Required code after slice 1 | Observed at this commit |
| --- | --- | --- | --- | --- |
| P0 | positive | the unchanged checkpoint tree builds | built | built (escape passes) |
| N02 | escape | a composition draws native elements and its own style | COMPOSITION_NATIVE_ELEMENT | built (escape passes) |
| N03 | escape | a registered composition invents a chart element | COMPOSITION_NATIVE_ELEMENT | built (escape passes) |
| N05 | escape | a composition imports the vendor Button | VENDOR_OUTSIDE_OWNER | built (escape passes) |
| N07 | escape | a composition imports the vendor Button through an alias | VENDOR_OUTSIDE_OWNER | built (escape passes) |
| N08 | escape | a class is passed to a catalog piece | PRESENTATION_ESCAPE | rejected: CLOSED_VISUAL_BOUNDARY: src/svelte/pieces/ContentFlow.svelte: presentation escape into src/svelte/pieces/Heading.svelte: class |
| N08b | escape | a class is passed to a catalog piece imported under an alias | PRESENTATION_ESCAPE | built (escape passes) |
| N09 | escape | a style directive is passed to a catalog piece | PRESENTATION_ESCAPE | rejected: CLOSED_VISUAL_BOUNDARY: src/svelte/pieces/ContentFlow.svelte: presentation escape into src/svelte/pieces/Heading.svelte: color |
| N10 | escape | props are spread onto a catalog piece | PRESENTATION_ESCAPE | rejected: CLOSED_VISUAL_BOUNDARY: src/svelte/pieces/ContentFlow.svelte: composition native/prop forwarding |
| N11 | escape | a data attribute is passed to a catalog piece | PRESENTATION_ESCAPE | rejected: CLOSED_VISUAL_BOUNDARY: src/svelte/pieces/ContentFlow.svelte: presentation escape into src/svelte/pieces/Heading.svelte: data-x |
| N13 | escape | a catalog piece is mounted through svelte:component | COMPOSITION_UNKNOWN_PIECE | built (escape passes) |
| N15 | escape | a foundation styles everything with a global selector | CROSS_OWNER_CSS | built (escape passes) |
| N16 | escape | a stylesheet targets another owner's slot | CROSS_OWNER_CSS | built (escape passes) |
| N17 | escape | a new stylesheet restyles every button without geometry | CROSS_OWNER_CSS | built (escape passes) |
| N18 | escape | a non-.css stylesheet is imported by a foundation | UNDECLARED_VISUAL_SOURCE | built (escape passes) |
| N21 | escape | a .js helper injects markup | VISUAL_RUNTIME_GLOBAL | built (escape passes) |
| N22 | escape | a composition queries the document | VISUAL_RUNTIME_GLOBAL | built (escape passes) |
| N23 | escape | a composition animates an element | VISUAL_RUNTIME_GLOBAL | built (escape passes) |
| N24 | escape | a composition renders raw HTML | COMPOSITION_NATIVE_ELEMENT | rejected: CLOSED_VISUAL_BOUNDARY: src/svelte/pieces/AccessGate.svelte: RAW_HTML |
| N25 | escape | a composition renders a dynamic element | COMPOSITION_NATIVE_ELEMENT | built (escape passes) |
| N28 | escape | an undeclared Svelte file draws a control | UNDECLARED_VISUAL_SOURCE | built (escape passes) |
| N29 | escape | an undeclared font is added | UNDECLARED_VISUAL_SOURCE | built (escape passes) |
| N30 | escape | an undeclared SVG is added | UNDECLARED_VISUAL_SOURCE | built (escape passes) |
| N31 | control | a symlink enters the visual roots | VISUAL_SOURCE_SYMLINK | rejected: VISUAL_SOURCE_SYMLINK: src/build/svelte/linked.svelte |
| N32 | escape | the HTML template gains markup | UNQUALIFIED_ARTIFACT | built (escape passes) |
| N33 | escape | the page route gains markup | UNQUALIFIED_ARTIFACT | built (escape passes) |
| N34 | escape | the public catalog page gains markup | UNQUALIFIED_ARTIFACT | built (escape passes) |
| N35 | escape | the Vite configuration gains a plugin | UNQUALIFIED_ARTIFACT | built (escape passes) |
| N44 | control | a generated registry is edited by hand | WEB_CATALOG_DERIVATION / CATALOG_DERIVATION | rejected: WEB_CATALOG_DERIVATION: src/svelte/renderer-registry.ts |
| N47 | escape | relabelling an owner unsealed hides a class escape | PRESENTATION_ESCAPE | built (escape passes) |
| N49h | control | the human build family runs the gate before its worker | RENDERER_DOM / COMPOSITION_NATIVE_ELEMENT | rejected: SVELTE_CHECK_FAILED CLOSED_VISUAL_BOUNDARY: src/svelte/FrameBody.svelte: RENDERER_DOM   |
| N49p | control | the public-catalog build family runs the gate before its worker | RENDERER_DOM / COMPOSITION_NATIVE_ELEMENT | rejected: SVELTE_CHECK_FAILED CLOSED_VISUAL_BOUNDARY: src/svelte/FrameBody.svelte: RENDERER_DOM   |
| N51 | escape | deleting a gate module cannot switch the gate off | CATALOG_GATE_SOURCES | crashed: Cannot find module '/private/var/folders/dw/sb_m2hxd62j2b7cw8rsd18280000gn/T/desert-catalog-gate-Y9k8Ha/src/authoring/visual-boundary/closed.ts' imported from /private/var/folders/dw/sb_m2hxd62j2b7cw8rsd18280000gn/T/dese |
| C1 | control | a sealed adapter draws a native element | RENDERER_DOM / COMPOSITION_NATIVE_ELEMENT | rejected: CLOSED_VISUAL_BOUNDARY: src/svelte/FrameBody.svelte: RENDERER_DOM |
| C2 | control | a finite-input owner receives a class | FINITE_CATALOG_INPUT / PRESENTATION_ESCAPE | rejected: FINITE_CATALOG_INPUT: src/svelte/explorer/CatalogWorkspace.svelte: caller visual input class |
| C3 | control | a sealed adapter imports a visual helper | NONVISUAL_DEPENDENCY / VISUAL_RUNTIME_GLOBAL | rejected: NONVISUAL_DEPENDENCY: src/svelte/FrameBody.svelte: visual or opaque dependency: ./pieces/dock-above.ts |
| C4 | control | a stylesheet gives every button toolbar geometry | TOOLBAR_OWNERSHIP / CROSS_OWNER_CSS | rejected: TOOLBAR_OWNERSHIP: src/svelte/pieces/rogue.css: global geometry min-height may reach toolbar-owned elements: button |
