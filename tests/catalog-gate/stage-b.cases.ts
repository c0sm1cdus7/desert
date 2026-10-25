// Stage B cases whose rule has landed, in the form of stage-a.cases.ts. The rest are test.todo in stage-b.test.ts.
// Under the strict build (Q1) the unmutated tree has violations; a case passes when its mutation ADDS one with its code.
import type { GateCase } from "./stage-a.cases.ts";
import type { Mutation } from "./harness.ts";

const catalog = "src/svelte/catalog", compositions = `${catalog}/compositions`, foundations = `${catalog}/foundations`;
const heading = `${foundations}/heading`, accessGate = `${compositions}/access-gate/AccessGate.svelte`;
const contentFlow = `${compositions}/content-flow/ContentFlow.svelte`, lockScreen = `${compositions}/lock-screen/LockScreen.svelte`;
const flowScript = '  import { say } from "../../../infra/messages.ts";';
const headingImport = '  import Heading from "../../foundations/heading/Heading.svelte";';
const script = '<script lang="ts">\n';
const intoFlow = (imports: string, markup = ""): Mutation => async tree => {
  await tree.replace(contentFlow, flowScript, `${flowScript}\n${imports}`);
  if (markup) await tree.append(contentFlow, `\n${markup}\n`);
};

export const stageB: readonly GateCase[] = [
  // N01 recreates the lock password the way it was hand-built: vendor input parts first (VENDOR_OUTSIDE_OWNER), then, with
  // no vendor import at all, a presentation prop the contract does not declare (PRESENTATION_ESCAPE).
  { id: "N01", title: "the lock password is rebuilt from vendor input parts", kind: "escape", expect: ["VENDOR_OUTSIDE_OWNER"], at: lockScreen,
    mutate: async tree => {
      await tree.replace(lockScreen, script, `${script}  import * as Rebuilt from "../../../vendor/components/ui/input-group/index.js";\n`);
      await tree.append(lockScreen, '\n<Rebuilt.Input type="password" />\n');
    } },
  { id: "N01b", title: "the lock screen passes a presentation prop to its field", kind: "escape", expect: ["PRESENTATION_ESCAPE"], at: lockScreen,
    mutate: tree => tree.replace(lockScreen, '<Field primitive="input.text"', '<Field primitive="input.text" presentation="access"') },
  // A component has one top-level <style> (Availability has had its own since F1e), so the rule joins that block and
  // styles an element the foundation draws; each anchor fails loudly if it goes away.
  { id: "P1", title: "a foundation styles its own element with a scoped style", kind: "positive", expect: [],
    mutate: async tree => {
      const availability = `${foundations}/availability/Availability.svelte`;
      await tree.replace(availability, "<span>{label}</span>", '<span class="availability-note">{label}</span>');
      await tree.replace(availability, "</style>", "  .availability-note { opacity: 1; }\n</style>");
    } },
  { id: "P2", title: "a mechanism owned by a foundation observes size", kind: "positive", expect: [],
    mutate: async tree => {
      const folder = `${catalog}/mechanisms/availability-measure`;
      await tree.create(`${folder}/availability-measure.mechanism.ts`, 'import { defineMechanism } from "../../../../authoring/catalog/define.ts";\n'
        + 'export const AvailabilityMeasure = defineMechanism({ id: "availability-measure", owner: "availability", files: ["availability-measure.ts"] } as const);\n');
      await tree.create(`${folder}/availability-measure.ts`, "export const observe = (node: HTMLElement, changed: () => void) => {\n"
        + "  const observer = new ResizeObserver(changed); observer.observe(node); return () => observer.disconnect();\n};\n");
      await tree.regenerateCatalog();
    } },
  { id: "P3", title: "a composition renders a slot it declares", kind: "positive", expect: [],
    mutate: async tree => {
      await tree.replace(`${compositions}/access-gate/access-gate.catalog.ts`, "uses: [", 'slots: { footer: { accepts: ["action"] } }, uses: [');
      await tree.append(accessGate, "\n{#if footer}{@render footer()}{/if}\n");
      await tree.regenerateCatalog();
    } },
  { id: "N04", title: "a composition writes a text node", kind: "escape", expect: ["COMPOSITION_NATIVE_ELEMENT"],
    mutate: tree => tree.append(accessGate, "\nWelcome back\n") },
  { id: "N06", title: "a foundation imports a vendor family it does not own", kind: "escape", expect: ["VENDOR_OUTSIDE_OWNER"],
    mutate: tree => tree.replace(`${heading}/Heading.svelte`, script, `${script}  import { Slider } from "../../../vendor/components/ui/slider/index.js";\n  void Slider;\n`) },
  { id: "N12", title: "children are passed to a catalog piece", kind: "escape", expect: ["PRESENTATION_ESCAPE"],
    mutate: intoFlow(headingImport, '<Heading kind="page" text="x">children</Heading>') },
  { id: "N14", title: "a composition gains a style block", kind: "escape", expect: ["CROSS_OWNER_CSS"],
    mutate: tree => tree.append(accessGate, "\n<style>.rogue { color: red; }</style>\n") },
  { id: "N19", title: "a composition imports a stylesheet", kind: "escape", expect: ["CROSS_OWNER_CSS"],
    mutate: intoFlow('  import "../../mechanisms/structured-content/structured-content.css";') },
  { id: "N26", title: "a composition renders an undeclared snippet", kind: "escape", expect: ["SLOT_NOT_TYPED"],
    mutate: tree => tree.append(accessGate, "\n{@render extra()}\n") },
  { id: "N27", title: "a composition defines a snippet that is not a declared slot", kind: "escape", expect: ["SLOT_NOT_TYPED"],
    mutate: tree => tree.append(accessGate, "\n{#snippet rogue()}{/snippet}\n") },
  { id: "N37", title: "a byte of an approved foundation's stylesheet changes", kind: "escape", expect: ["FOUNDATION_UNAPPROVED_CHANGE"],
    mutate: async tree => { await tree.approveInCopy("field"); await tree.append(`${foundations}/field/field.css`, "\n/* x */\n"); } },
  { id: "N38", title: "a vendor file owned by an approved foundation changes", kind: "escape", expect: ["FOUNDATION_UNAPPROVED_CHANGE"],
    mutate: async tree => { await tree.approveInCopy("action"); await tree.append("src/svelte/vendor/components/ui/button/button.svelte", "\n<!-- x -->\n"); } },
  { id: "N39", title: "the contract of an approved foundation changes", kind: "escape", expect: ["FOUNDATION_UNAPPROVED_CHANGE"],
    mutate: async tree => { await tree.approveInCopy("heading"); await tree.append(`${heading}/heading.contract.ts`, "// x\n"); } },
  { id: "N40", title: "an approved composition mounts pieces that are not approved", kind: "escape", expect: ["PIECE_NOT_APPROVED"],
    mutate: tree => tree.approveInCopy("lock-screen") },
  { id: "N41", title: "a digest is set by hand", kind: "escape", expect: ["FOUNDATION_UNAPPROVED_CHANGE"],
    mutate: tree => tree.approveInCopy("heading", { source: "0".repeat(64) }) },
  { id: "N42", title: "an unknown ledger field is refused", kind: "escape", expect: ["APPROVALS_LEDGER"],
    mutate: tree => tree.replace(`${catalog}/approvals.json`, '  "version": ', '  "reviewer": "anyone",\n  "version": ') },
  { id: "N43", title: "the generated catalog index edited by hand", kind: "escape", expect: ["CATALOG_DERIVATION"],
    mutate: tree => tree.append(`${catalog}/index.ts`, 'export { default as Rogue } from "./foundations/heading/Heading.svelte";\n') },
  // A kind change is caught earlier by rule B (each kind has its own closed fields); any data change shows the same law.
  { id: "N45", title: "a declaration changed without regenerating", kind: "escape", expect: ["CATALOG_DERIVATION"],
    mutate: tree => tree.replace(`${heading}/heading.catalog.ts`, 'states: ["default"]', 'states: ["default", "loading"]') },
  // Heading's contract is closed and its `kind` axis declared: the union gains a value in the contract only.
  { id: "N46", title: "a contract union gains a value the declaration and its specimens do not have", kind: "escape", expect: ["VARIANT_WITHOUT_SPECIMEN"],
    at: `${heading}/heading.contract.ts`, mutate: async tree => {
      await tree.replace(`${heading}/heading.contract.ts`, 'kind: Type.Literal("group"),', 'kind: Type.Union([Type.Literal("group"), Type.Literal("access")]),');
      await tree.regenerateCatalog();
    } },
  { id: "N48", title: "a Components constructor without a composition", kind: "escape", expect: ["GRAMMAR_NOT_IN_CATALOG"],
    mutate: tree => tree.replace("src/views/components.ts", '  Header: contentBuilder("header"),', '  Header: contentBuilder("header"), Foo: contentBuilder("header"),') },
  { id: "N52", title: "a DOM-touching helper lives in infra", kind: "escape", expect: ["VISUAL_RUNTIME_GLOBAL"],
    mutate: tree => tree.create("src/svelte/infra/pulse.svelte.ts", "export const pulse = (node: HTMLElement) => node.animate([{ opacity: 0 }], 200);\n") },
  { id: "N53", title: "a Svelte file in a piece folder that its declaration does not list", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: tree => tree.create(`${heading}/HeadingExtra.svelte`, "<h2>x</h2>\n") },
  // Plan §14 (language). N56, a literal in a product view, is the product source gate's: tests/catalog-gate/n56-product-literal.test.ts.
  { id: "N55", title: "a foundation writes a literal text node", kind: "escape", expect: ["LITERAL_TEXT"], at: `${heading}/Heading.svelte`,
    mutate: tree => tree.append(`${heading}/Heading.svelte`, "\n<p>Unread</p>\n") },
  { id: "N57", title: "a piece declares a message key its locale bundle lacks", kind: "escape", expect: ["MESSAGE_MISSING"],
    mutate: async tree => {
      await tree.replace(`${heading}/heading.catalog.ts`, 'shape: "none",', 'messages: ["heading.missing"], shape: "none",');
      await tree.regenerateCatalog();
    } },
  { id: "N58", title: "a key in en.json that no piece owns", kind: "escape", expect: ["CATALOG_DECLARATION"],
    mutate: async tree => {
      await tree.replace("src/messages/en.json", '  "feedback": {', '  "orphan": { "unowned": "Nobody declares this sentence" },\n  "feedback": {');
      await tree.regenerateCatalog();
    } },
  { id: "N54", title: "the build path imports the test-only evidence project", kind: "escape", expect: ["VISUAL_RUNTIME_GLOBAL"],
    mutate: tree => tree.replace("src/build/svelte/project.ts", 'import { join } from "node:path";\n',
      'import { join } from "node:path";\nimport type { createEvidenceProject } from "../../testing/evidence-project.ts";\n') },
];
