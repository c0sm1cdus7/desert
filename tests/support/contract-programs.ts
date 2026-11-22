// Independent installable programs that exercise contracts through the core adapter.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../../src/fields/messages.ts";
import { text } from "../../src/fields/fields.ts";
import { programa, programAct, type LocalProgram } from "../../src/tools/installable/program.ts";
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
  id: "documentos",
  version: "3.0.0",
  desert: 1,
  codigo: [import.meta.filename],
  hechos: [{ nombre: "documentos/emitido", forma: Type.Object({ venta: Type.String(), comprobante: Type.String() }) }],
  inicial: () => ({ fiscal: new Map<string, unknown>() }),
} as const;
type Documents = LocalProgram<typeof metadata>;
const group = {
  purpose: "emitir comprobantes",
  targets: () => [],
  view: () => "",
  summary: () => "",
  palabras: words("Fiscal", "f"),
};
export const documentProgram = programa(metadata, {
  ...group,
  palabras: words("Documentos", "d"),
  skill,
  artifact: documents().artifact,
  ofrece: documents().ofrece,
  pide: documents().pide,
  proyectores: documents().proyectores,
  herramientas: {
    fiscal: {
      ...group,
      acts: {
        emitir: programAct<Documents, ReturnType<typeof input>, readonly ["invalida"]>({
          name: "emitir",
          enter: "emitir",
          purpose: "emitir un comprobante",
          key: "e",
          on: "tool",
          undoable: true,
          input: input(),
          outside: ["invalida"],
          run: (value, context) =>
            value.venta === "invalid"
              ? { status: "rejected", reason: "invalida", value: { codigo: "invalida" } }
              : {
                  status: "accepted",
                  value: { id: value.venta, numero: "1" },
                  effects: context.state.tools.own.fiscal.has(value.venta)
                    ? []
                    : [
                        {
                          layer: "program",
                          kind: "documentos/emitido",
                          data: { venta: value.venta, comprobante: value.venta },
                          by: context.by,
                          cause: [],
                        },
                      ],
                },
          cases: [
            {
              promise: "Emite un comprobante",
              input: { venta: "v1" },
              then: { says: "", facts: [{ kind: "documentos/emitido", data: { venta: "v1", comprobante: "v1" } }] },
            },
          ],
        }),
      },
    },
  },
  plegar: (own, event) =>
    event.kind === "documentos/emitido"
      ? {
          fiscal: new Map([
            ...own.fiscal,
            [event.data.comprobante, { numero: "1", estado: "emitido", privado: "oculto" }],
          ]),
        }
      : own,
});
const salesMetadata = {
  id: "ventas",
  version: "2.0.0",
  desert: 1,
  codigo: [import.meta.filename],
  hechos: [],
  inicial: () => ({}),
} as const;
type Sales = LocalProgram<typeof salesMetadata>;
export const salesProgram = programa(salesMetadata, {
  ...group,
  palabras: words("Ventas", "v"),
  skill,
  artifact: sales().artifact,
  ofrece: sales().ofrece,
  pide: sales().pide,
  proyectores: sales().proyectores,
  herramientas: {
    facturacion: {
      ...group,
      palabras: words("Facturación", "f"),
      acts: {
        leer: programAct<Sales, ReturnType<typeof input>>({
          name: "leer",
          enter: "leer",
          purpose: "leer el comprobante y sus avisos",
          key: "l",
          on: "tool",
          undoable: true,
          input: input(),
          run: (value, context) => {
            const port = context.contracts?.["documentos-fiscales"];
            if (!port || !context.cut) throw new Error("Missing contractual context");
            return {
              status: "accepted",
              value: {
                reading: port.objects.comprobante?.read(value.venta, context.cut),
                notices: port.notices.emitido?.(context.cut),
              },
            };
          },
          cases: [{ promise: "Lee sin comprobante previo", input: { venta: "v1" }, then: { says: "", facts: [] } }],
        }),
        facturar: programAct<Sales, ReturnType<typeof input>>({
          name: "facturar",
          enter: "facturar",
          purpose: "facturar una venta",
          key: "f",
          on: "tool",
          undoable: true,
          input: input(),
          run: async (value, context) => ({
            status: "accepted",
            value: await context.contracts?.["documentos-fiscales"]?.actions.emitir?.(value),
          }),
          cases: [{ promise: "Pide el comprobante", input: { venta: "v1" }, then: { says: "", facts: [] } }],
        }),
      },
    },
  },
  plegar: own => own,
});
export const contractPrograms = [salesProgram, documentProgram] as const;
/** The same provider, with a question the surface and the derived checks can ask: they ask every act composed. */
const fiscal = documentProgram.herramientas.fiscal;
const askedInput = Type.Object({ venta: text("Venta", "v1") });
const { id, version, desert, codigo, hechos, inicial } = documentProgram;
export const askableDocumentProgram = programa(
  { id, version, desert, codigo, hechos, inicial },
  {
    ...documentProgram,
    herramientas: { fiscal: { ...fiscal, acts: { emitir: { ...fiscal.acts.emitir, input: askedInput } } } },
  },
);
export const contractPackages = programContracts(contractPrograms);
