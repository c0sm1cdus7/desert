// A consumer's cases run on the whole composition: they load the provider, promise its facts and fix a kit.
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { askableDocumentProgram, documentProgram } from "../../../../tests/support/contract-programs.ts";
import { input, rejection } from "../../../../tests/support/distribution-contracts.ts";
import { presentation } from "../../../../tests/support/installable-program.ts";
import { text } from "../../../fields/fields.ts";
import { componer } from "../../../runtime/distributions/compose.ts";
import { programa, programAct, type LocalProgram } from "../../../tools/installable/program.ts";
import type { State } from "../../../tools/tool-contract.ts";
import { certifyContracts } from "../../contracts/public-contracts.ts";
import { promisedChecks } from "./promised.ts";
const metadata = {
  id: "ventas",
  version: "1.0.0",
  desert: 1,
  codigo: [import.meta.filename],
  hechos: [],
  inicial: () => ({}),
} as const;
type Sales = LocalProgram<typeof metadata>;
const contract = "documentos-fiscales";
const issued = "ya emitido";
const unheld = "sin Documentos en el kit";
const request = {
  acciones: {
    emitir: {
      entrada: input(),
      salida: Type.Object({ id: Type.String() }),
      rechazos: Type.Union([rejection(), Type.Object({ reason: Type.Literal(issued) })]),
    },
  },
  objetos: {
    comprobante: { clave: Type.String(), datos: Type.Object({ estado: Type.Literal("emitido") }), lectura: "casa" },
  },
  avisos: {},
  casos: [
    {
      id: "sin-comprobante",
      actor: "beto",
      prepare: { version: 2, selections: [{ kind: "tool", program: "documentos", tool: "fiscal" }] },
      steps: [{ kind: "read", name: "comprobante", key: "v1", at: "current", expect: { status: "unavailable" } }],
    },
  ],
} as const;
const offered = (state: State<Sales>) => {
  const reader = state.readings?.[contract];
  if (reader?.can("emitir") === false) return unheld;
  return reader?.comprobante?.("v1").status === "found" ? issued : undefined;
};
const words = (name: string, key: string) => ({ name, key, listed: name, empty: "Sin datos", reads: {}, presents: [] });
const group = { purpose: "facturar ventas", targets: () => [], view: () => "", summary: () => "" };
const facturar = programAct<Sales, ReturnType<typeof Type.Object<{ venta: ReturnType<typeof text> }>>>({
  name: "facturar",
  enter: "facturar",
  purpose: "facturar la venta",
  key: "f",
  on: "tool",
  undoable: true,
  input: Type.Object({ venta: text("Venta", "v1") }),
  refuses: [issued, unheld],
  offered,
  run: async (value, context) => {
    const response = await context.contracts?.[contract]?.actions.emitir?.({ venta: value.venta });
    if (response?.status !== "accepted") throw new Error("The provider did not issue");
    return { status: "accepted", text: `Facturada · ${value.venta}` };
  },
  cases: [
    {
      promise: "Factura con Documentos cargado desde otro programa",
      given: [{ program: "documentos", tool: "fiscal", act: "emitir", input: { venta: "v2" } }],
      input: { venta: "v1" },
      then: {
        says: "Facturada · v1",
        facts: [{ program: "documentos", kind: "documentos/emitido", data: { venta: "v1", comprobante: "v1" } }],
      },
    },
    {
      promise: "Se apaga sin Documentos en el kit",
      given: [{ kit: { identity: "beto", selections: [{ kind: "program", program: "ventas" }] } }],
      by: "beto",
      input: { venta: "v1" },
      then: { refused: unheld },
    },
  ],
});
const consumer = programa(metadata, {
  ...group,
  palabras: words("Ventas", "v"),
  skill: documentProgram.skill,
  artifact: "consumer-commit",
  pide: { [contract]: request },
  herramientas: { facturacion: { ...group, palabras: words("Facturación", "f"), acts: { facturar } } },
  plegar: own => own,
});
const options = {
  programas: [consumer, askableDocumentProgram],
  identidades: true,
  mentes: { asistentes: false, programas: [] },
  presentacion: presentation,
} as const;
const composed = componer({ ...options, contratos: await certifyContracts(options) });
const checks = promisedChecks(composed.program, composed.shown).filter(check => check.name.startsWith("ventas · "));
it("derives the consumer's checks, with no case for the cause it reads from the contract", () => {
  expect(checks.map(check => check.name)).toContain(
    "ventas · facturacion/facturar · Factura con Documentos cargado desde otro programa",
  );
});
for (const check of checks) it(check.name, check.run);
