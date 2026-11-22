// A consumer's cases run on the whole composition: they load the provider, promise its facts and fix a kit.
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { askableDocumentProgram, documentProgram } from "../../../../tests/support/contract-programs.ts";
import { input, rejection } from "../../../../tests/support/distribution-contracts.ts";
import { presentation } from "../../../../tests/support/installable-program.ts";
import { text } from "../../../fields/fields.ts";
import { compose } from "../../../runtime/distributions/compose.ts";
import { defineProgram, programAct, type LocalProgram } from "../../../tools/installable/program.ts";
import type { State } from "../../../tools/tool-contract.ts";
import { certifyContracts } from "../../contracts/public-contracts.ts";
import { promisedChecks } from "./promised.ts";
const metadata = {
  id: "sales",
  version: "1.0.0",
  desert: 1,
  code: [import.meta.filename],
  facts: [],
  initial: () => ({}),
} as const;
type Sales = LocalProgram<typeof metadata>;
const contract = "fiscal-documents";
const issued = "ya emitido";
const unheld = "sin Documentos en el kit";
const request = {
  actions: {
    issue: {
      input: input(),
      output: Type.Object({ id: Type.String() }),
      rejections: Type.Union([rejection(), Type.Object({ reason: Type.Literal(issued) })]),
    },
  },
  objects: {
    voucher: { key: Type.String(), data: Type.Object({ state: Type.Literal("issued") }), reading: "house" },
  },
  notices: {},
  cases: [
    {
      id: "sin-voucher",
      actor: "beto",
      prepare: { version: 2, selections: [{ kind: "tool", program: "documents", tool: "fiscal" }] },
      steps: [{ kind: "read", name: "voucher", key: "v1", at: "current", expect: { status: "unavailable" } }],
    },
  ],
} as const;
const offered = (state: State<Sales>) => {
  const reader = state.readings?.[contract];
  if (reader?.can("issue") === false) return unheld;
  return reader?.voucher?.("v1").status === "found" ? issued : undefined;
};
const words = (name: string, key: string) => ({ name, key, listed: name, empty: "Sin datos", reads: {}, presents: [] });
const group = { purpose: "facturar ventas", targets: () => [], view: () => "", summary: () => "" };
const invoice = programAct<Sales, ReturnType<typeof Type.Object<{ sale: ReturnType<typeof text> }>>>({
  name: "facturar",
  enter: "facturar",
  purpose: "facturar la venta",
  key: "f",
  on: "tool",
  undoable: true,
  input: Type.Object({ sale: text("Venta", "v1") }),
  refuses: [issued, unheld],
  offered,
  run: async (value, context) => {
    const response = await context.contracts?.[contract]?.actions.issue?.({ sale: value.sale });
    if (response?.status !== "accepted") throw new Error("The provider did not issue");
    return { status: "accepted", text: `Facturada · ${value.sale}` };
  },
  cases: [
    {
      promise: "Factura con Documentos cargado desde otro programa",
      given: [{ program: "documents", tool: "fiscal", act: "issue", input: { sale: "v2" } }],
      input: { sale: "v1" },
      then: {
        says: "Facturada · v1",
        facts: [{ program: "documents", kind: "documents/issued", data: { sale: "v1", voucher: "v1" } }],
      },
    },
    {
      promise: "Se apaga sin Documentos en el kit",
      given: [{ kit: { identity: "beto", selections: [{ kind: "program", program: "sales" }] } }],
      by: "beto",
      input: { sale: "v1" },
      then: { refused: unheld },
    },
  ],
});
const consumer = defineProgram(metadata, {
  ...group,
  words: words("Ventas", "v"),
  skill: documentProgram.skill,
  artifact: "consumer-commit",
  requests: { [contract]: request },
  tools: { billing: { ...group, words: words("Facturación", "f"), acts: { invoice } } },
  fold: own => own,
});
const options = {
  programs: [consumer, askableDocumentProgram],
  identities: true,
  minds: { assistants: false, programs: [] },
  shown: presentation,
} as const;
const composed = compose({ ...options, contracts: await certifyContracts(options) });
const checks = promisedChecks(composed.program, composed.shown).filter(check => check.name.startsWith("sales · "));
it("derives the consumer's checks, with no case for the cause it reads from the contract", () => {
  expect(checks.map(check => check.name)).toContain(
    "sales · billing/invoice · Factura con Documentos cargado desde otro programa",
  );
});
for (const check of checks) it(check.name, check.run);
