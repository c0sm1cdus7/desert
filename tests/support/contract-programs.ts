// Independent installable programs that exercise contracts through the core adapter.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../../src/fields/messages.ts";
import { text } from "../../src/fields/fields.ts";
import { defineProgram, programAct, type LocalProgram } from "../../src/tools/installable/program.ts";
import { programContracts } from "../../src/runtime/distributions/program-contracts.ts";
import { documents, sales, input } from "./contract-packages.ts";
const words = (name: string, key: string) => ({ name, key, listed: name, empty: "Sin datos", reads: {}, presents: [] });
const skill = defineMessage({
  id: "fixture.contracts.skill",
  kind: "skill",
  parameters: Type.Object({}),
  texts: { es: "Usá las acciones declaradas por el programa." },
});
const metadata = {
  id: "documents",
  version: "3.0.0",
  desert: 1,
  code: [import.meta.filename],
  facts: [{ kind: "documents/issued", schema: Type.Object({ sale: Type.String(), voucher: Type.String() }) }],
  initial: () => ({ fiscal: new Map<string, unknown>() }),
} as const;
type Documents = LocalProgram<typeof metadata>;
const group = {
  purpose: "emitir comprobantes",
  targets: () => [],
  view: () => "",
  summary: () => "",
  words: words("Fiscal", "f"),
};
export const documentProgram = defineProgram(metadata, {
  ...group,
  words: words("Documentos", "d"),
  skill,
  artifact: documents().artifact,
  offers: documents().offers,
  requests: documents().requests,
  projectors: documents().projectors,
  tools: {
    fiscal: {
      ...group,
      acts: {
        issue: programAct<Documents, ReturnType<typeof input>, readonly ["invalida"]>({
          name: "emitir",
          enter: "emitir",
          purpose: "emitir un comprobante",
          key: "e",
          on: "tool",
          undoable: true,
          input: input(),
          outside: ["invalida"],
          run: (value, context) =>
            value.sale === "invalid"
              ? { status: "rejected", reason: "invalida", value: { code: "invalida" } }
              : {
                  status: "accepted",
                  value: { id: value.sale, number: "1" },
                  effects: context.state.tools.own.fiscal.has(value.sale)
                    ? []
                    : [
                        {
                          layer: "program",
                          kind: "documents/issued",
                          data: { sale: value.sale, voucher: value.sale },
                          by: context.by,
                          cause: [],
                        },
                      ],
                },
          cases: [
            {
              promise: "Emite un comprobante",
              input: { sale: "v1" },
              then: { says: "", facts: [{ kind: "documents/issued", data: { sale: "v1", voucher: "v1" } }] },
            },
          ],
        }),
      },
    },
  },
  fold: (own, event) =>
    event.kind === "documents/issued"
      ? {
          fiscal: new Map([...own.fiscal, [event.data.voucher, { number: "1", state: "issued", privado: "hidden" }]]),
        }
      : own,
});
const salesMetadata = {
  id: "sales",
  version: "2.0.0",
  desert: 1,
  code: [import.meta.filename],
  facts: [],
  initial: () => ({}),
} as const;
type Sales = LocalProgram<typeof salesMetadata>;
export const salesProgram = defineProgram(salesMetadata, {
  ...group,
  words: words("Ventas", "v"),
  skill,
  artifact: sales().artifact,
  offers: sales().offers,
  requests: sales().requests,
  projectors: sales().projectors,
  tools: {
    billing: {
      ...group,
      words: words("Facturación", "f"),
      acts: {
        read: programAct<Sales, ReturnType<typeof input>>({
          name: "leer",
          enter: "leer",
          purpose: "leer el comprobante y sus avisos",
          key: "l",
          on: "tool",
          undoable: true,
          input: input(),
          run: (value, context) => {
            const port = context.contracts?.["fiscal-documents"];
            if (!port || !context.cut) throw new Error("Missing contractual context");
            return {
              status: "accepted",
              value: {
                reading: port.objects.voucher?.read(value.sale, context.cut),
                notices: port.notices.issued?.(context.cut),
              },
            };
          },
          cases: [{ promise: "Lee sin comprobante previo", input: { sale: "v1" }, then: { says: "", facts: [] } }],
        }),
        invoice: programAct<Sales, ReturnType<typeof input>>({
          name: "facturar",
          enter: "facturar",
          purpose: "facturar una venta",
          key: "f",
          on: "tool",
          undoable: true,
          input: input(),
          run: async (value, context) => ({
            status: "accepted",
            value: await context.contracts?.["fiscal-documents"]?.actions.issue?.(value),
          }),
          cases: [{ promise: "Pide el comprobante", input: { sale: "v1" }, then: { says: "", facts: [] } }],
        }),
      },
    },
  },
  fold: own => own,
});
export const contractPrograms = [salesProgram, documentProgram] as const;
/** The same provider, with a question the surface and the derived checks can ask: they ask every act composed. */
const fiscal = documentProgram.tools.fiscal;
const askedInput = Type.Object({ sale: text("Venta", "v1") });
const { id, version, desert, code, facts, initial } = documentProgram;
export const askableDocumentProgram = defineProgram(
  { id, version, desert, code, facts, initial },
  {
    ...documentProgram,
    tools: { fiscal: { ...fiscal, acts: { issue: { ...fiscal.acts.issue, input: askedInput } } } },
  },
);
export const contractPackages = programContracts(contractPrograms);
