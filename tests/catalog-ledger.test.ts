// The approvals ledger is closed data: one entry per declared piece and theme, no self-granted approval shape.
import assert from "node:assert/strict";
import test from "node:test";
import { assertLedgerStructure } from "../src/authoring/catalog/gate/ledger.ts";
import { readDeclarations } from "../src/authoring/catalog/read-declaration.ts";

const at = (path: string, source: string) => readDeclarations(path, source).map(declaration => ({ path, declaration }));
const declarations = [
  ...at("src/svelte/catalog/foundations/field/field.catalog.ts", `import { C } from "./c.ts";
export const F = defineFoundation({ id: "field", purpose: "x", owner: { entry: "Field.svelte" }, shape: "radius",
  states: ["empty"], approval: "required", contract: C } as const);`),
  ...at("src/svelte/catalog/mechanisms/theme/theme.mechanism.ts",
    'export const T = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] } as const);'),
];
const valid = {
  version: "desert.catalog-approvals/1",
  pieces: {
    field: { status: "implemented", specimens: { "empty|shape=card": "proposed" } },
    theme: { status: "implemented" },
    meter: { status: "proposed", proposedOn: "2026-10-23", reason: "Home widget chart (owner decision Q2)." },
  },
};

test("a ledger with one entry per declared piece and theme passes", () => {
  assert.doesNotThrow(() => assertLedgerStructure(valid, declarations));
});

test("malformed ledgers are refused", () => {
  const cases: readonly [string, unknown, RegExp][] = [
    ["unknown field", { ...valid, reviewer: "agent" }, /APPROVALS_LEDGER/],
    ["implemented entry for an undeclared piece", { ...valid, pieces: { ...valid.pieces, ghost: { status: "implemented" } } }, /ghost is not declared/],
    ["approval without digests", { ...valid, pieces: { ...valid.pieces, field: { status: "approved", approvedOn: "2026-10-23", approvedBy: "owner" } } },
      /APPROVALS_LEDGER/],
    ["approval by someone other than the owner", { ...valid, pieces: { ...valid.pieces, field: { status: "approved", approvedOn: "2026-10-23",
      approvedBy: "agent", sourceDigest: "a".repeat(64), contractDigest: "b".repeat(64) } } }, /APPROVALS_LEDGER/],
    ["wrong version", { ...valid, version: "desert.catalog-approvals/0" }, /APPROVALS_LEDGER/],
  ];
  for (const [label, value, expected] of cases) {
    assert.throws(() => assertLedgerStructure(value, declarations),
      error => error instanceof Error && /^APPROVALS_LEDGER:/.test(error.message) && expected.test(error.message), label);
  }
});

test("a declared piece without an entry is implemented: the executor adds pieces without touching the owner's ledger", () => {
  const { field: _field, ...withoutField } = valid.pieces;
  assert.doesNotThrow(() => assertLedgerStructure({ ...valid, pieces: withoutField }, declarations));
});
