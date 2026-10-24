// Stage B cases whose rule has landed, in the form of stage-a.cases.ts. The rest are test.todo in stage-b.test.ts.
// Under the strict build (Q1) the unmutated tree has violations; a case passes when its mutation ADDS one with its code.
import type { GateCase } from "./stage-a.cases.ts";
import type { Mutation } from "./harness.ts";

const catalog = "src/svelte/catalog", compositions = `${catalog}/compositions`, foundations = `${catalog}/foundations`;
const heading = `${foundations}/heading`, accessGate = `${compositions}/access-gate/AccessGate.svelte`;
const contentFlow = `${compositions}/content-flow/ContentFlow.svelte`, lockScreen = `${compositions}/lock-screen/LockScreen.svelte`;
const flowScript = "  import Feedback from '../../foundations/feedback/Feedback.svelte';";
const headingImport = '  import Heading from "../../foundations/heading/Heading.svelte";';
const script = '<script lang="ts">\n';
const intoFlow = (imports: string, markup = ""): Mutation => async tree => {
  await tree.replace(contentFlow, flowScript, `${flowScript}\n${imports}`);
  if (markup) await tree.append(contentFlow, `\n${markup}\n`);
};

export const stageB: readonly GateCase[] = [
  { id: "N01", title: "the lock password is rebuilt from vendor input parts and a presentation prop", kind: "escape",
    expect: ["VENDOR_OUTSIDE_OWNER", "PRESENTATION_ESCAPE"],
    mutate: async tree => {
      await tree.replace(lockScreen, script, `${script}  import * as Rebuilt from "../../../vendor/components/ui/input-group/index.js";\n`);
      await tree.append(lockScreen, '\n<Rebuilt.Input type="password" />\n');
    } },
  { id: "N01b", title: "the lock screen passes a presentation prop to a field", kind: "escape", expect: ["PRESENTATION_ESCAPE"],
    mutate: intoFlow('  import TextInput from "../../foundations/text-input/TextInput.svelte";', '<TextInput presentation="access" class="lock" />') },
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
    mutate: async tree => { await tree.approveInCopy("field-well"); await tree.append(`${foundations}/field-well/field-well.css`, "\n/* x */\n"); } },
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
  { id: "N46", title: "a contract union gains a value the declaration and its specimens do not have", kind: "escape", expect: ["VARIANT_WITHOUT_SPECIMEN"],
    mutate: async tree => {
      await tree.replace(`${heading}/heading.catalog.ts`, 'states: ["default"]', 'states: ["default"], variants: { kind: ["page", "section"] }');
      await tree.replace(`${heading}/heading.contract.ts`, "export const HeadingContract = {} as const;",
        'import { Type } from "@sinclair/typebox";\nexport const HeadingContract = { props: Type.Object({ kind: Type.Union([Type.Literal("page"), '
        + 'Type.Literal("section"), Type.Literal("access")]) }, { additionalProperties: false }) } as const;');
      await tree.regenerateCatalog();
    } },
  { id: "N48", title: "a Components constructor without a composition", kind: "escape", expect: ["GRAMMAR_NOT_IN_CATALOG"],
    mutate: tree => tree.replace("src/views/components.ts", '  Header: contentBuilder("header"),', '  Header: contentBuilder("header"), Foo: contentBuilder("header"),') },
  { id: "N52", title: "a DOM-touching helper lives in infra", kind: "escape", expect: ["VISUAL_RUNTIME_GLOBAL"],
    mutate: tree => tree.create("src/svelte/infra/pulse.svelte.ts", "export const pulse = (node: HTMLElement) => node.animate([{ opacity: 0 }], 200);\n") },
  { id: "N53", title: "a Svelte file in a piece folder that its declaration does not list", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: tree => tree.create(`${heading}/HeadingExtra.svelte`, "<h2>x</h2>\n") },
  { id: "N54", title: "the build path imports the test-only evidence project", kind: "escape", expect: ["VISUAL_RUNTIME_GLOBAL"],
    mutate: tree => tree.replace("src/build/svelte/project.ts", 'import { join } from "node:path";\n',
      'import { join } from "node:path";\nimport type { createEvidenceProject } from "../../testing/evidence-project.ts";\n') },
];
