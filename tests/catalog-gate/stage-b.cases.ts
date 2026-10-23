// Stage B cases whose rule has landed, in the form of stage-a.cases.ts. The rest are test.todo in stage-b.test.ts.
import type { GateCase } from "./stage-a.cases.ts";

const catalog = "src/svelte/catalog", heading = `${catalog}/foundations/heading`;

export const stageB: readonly GateCase[] = [
  { id: "N42", title: "an unknown ledger field is refused", kind: "escape", expect: ["APPROVALS_LEDGER"],
    mutate: tree => tree.replace(`${catalog}/approvals.json`, '  "version": ', '  "reviewer": "anyone",\n  "version": ') },
  { id: "N43", title: "the generated catalog index edited by hand", kind: "escape", expect: ["CATALOG_DERIVATION"],
    mutate: tree => tree.append(`${catalog}/index.ts`, 'export { default as Rogue } from "./foundations/heading/Heading.svelte";\n') },
  // A kind change is caught earlier by rule B (each kind has its own closed fields); any data change shows the same law.
  { id: "N45", title: "a declaration changed without regenerating", kind: "escape", expect: ["CATALOG_DERIVATION"],
    mutate: tree => tree.replace(`${heading}/heading.catalog.ts`, 'states: ["default"]', 'states: ["default", "loading"]') },
  { id: "N53", title: "a Svelte file in a piece folder that its declaration does not list", kind: "escape", expect: ["UNDECLARED_VISUAL_SOURCE"],
    mutate: tree => tree.create(`${heading}/HeadingExtra.svelte`, "<h2>x</h2>\n") },
];
