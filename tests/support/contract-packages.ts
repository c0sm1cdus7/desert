// Independent consumer and provider declarations for the contractual execution fixtures.
import { Type } from "@sinclair/typebox";
import type { ContractPackage, ContractOffer, ContractCase } from "../../src/tools/contracts/package-contracts.ts";
export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture member");
  return value;
}
export const input = () => Type.Object({ venta: Type.String() }, { additionalProperties: false });
export const rejection = () => Type.Object({ codigo: Type.Literal("invalida") });
export const receipt = () => Type.Object({ numero: Type.String(), estado: Type.Literal("emitido") });
const documentOffer = (): ContractOffer => ({
  version: "1.3.0",
  acciones: {
    emitir: {
      ruta: "fiscal/emitir",
      entrada: input(),
      salida: Type.Object({ id: Type.String(), numero: Type.String() }),
      rechazos: rejection(),
    },
  },
  objetos: {
    comprobante: {
      clave: Type.String(),
      datos: receipt(),
      lectura: "casa",
      proyector: "comprobante",
    },
  },
  avisos: {
    emitido: {
      hecho: "documentos/emitido",
      datos: Type.Object({ venta: Type.String(), comprobante: Type.String() }),
      lectura: "casa",
    },
  },
});
export const documents = (): ContractPackage => ({
  id: "documentos",
  version: "3.0.0",
  artifact: "documents-commit",
  desert: 1,
  herramientas: { fiscal: ["emitir"] },
  hechos: ["documentos/emitido"],
  pide: {},
  proyectores: {
    comprobante: (own, key) => {
      const state = own.fiscal;
      const value: unknown = state instanceof Map ? state.get(key) : undefined;
      return value;
    },
  },
  ofrece: {
    "documentos-fiscales": documentOffer(),
  },
});
const consumerCases = (): readonly ContractCase[] => [
  {
    id: "emitir-y-leer",
    actor: "beto",
    prepare: {
      version: 2,
      selections: [
        { kind: "tool", program: "documentos", tool: "fiscal" },
        { kind: "tool", program: "ventas", tool: "facturacion" },
      ],
    },
    steps: [
      {
        kind: "action",
        name: "emitir",
        input: { venta: "v1" },
        expect: { status: "accepted", value: { id: "v1" } },
      },
      { kind: "notices", name: "emitido", expect: [{ venta: "v1", comprobante: "v1" }] },
      {
        kind: "read",
        name: "comprobante",
        key: "v1",
        at: "notice",
        expect: {
          status: "found",
          value: { numero: "1", estado: "emitido" },
        },
      },
      {
        kind: "action",
        name: "emitir",
        input: { venta: "v1" },
        expect: { status: "accepted", value: { id: "v1" } },
      },
      { kind: "notices", name: "emitido", expect: [{ venta: "v1", comprobante: "v1" }] },
    ],
  },
];
export const sales = (): ContractPackage => ({
  id: "ventas",
  version: "2.0.0",
  artifact: "sales-commit",
  desert: 1,
  herramientas: { facturacion: ["facturar"] },
  hechos: [],
  proyectores: {},
  ofrece: {},
  pide: {
    "documentos-fiscales": {
      acciones: {
        emitir: {
          entrada: Type.Object({ venta: Type.String() }, { additionalProperties: false }),
          salida: Type.Object({ id: Type.String() }),
          rechazos: Type.Object({ codigo: Type.Literal("invalida") }),
        },
      },
      objetos: {
        comprobante: {
          clave: Type.String(),
          datos: Type.Object({ numero: Type.String(), estado: Type.Literal("emitido") }),
          lectura: "casa",
        },
      },
      avisos: {
        emitido: {
          datos: Type.Object({ venta: Type.String(), comprobante: Type.String() }),
          lectura: "casa",
        },
      },
      casos: consumerCases(),
    },
  },
});
