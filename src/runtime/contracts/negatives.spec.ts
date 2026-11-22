import { required } from "../../../tests/support/distribution-contracts.ts";
import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { documents, sales, input, rejection, receipt } from "../../../tests/support/distribution-contracts.ts";
import { structuralContractErrors } from "./package-checks.ts";
import { validateContractPrograms } from "./validate-contracts.ts";
import { runContractCases } from "./contract-gate.ts";
import { contractSelections, contractHouse } from "../../../tests/support/distribution-contracts.ts";
import type { ContractOffer, ContractPackage } from "../../tools/contracts/package-contracts.ts";
const path = "ventas/documentos-fiscales";
const offered = (): ContractOffer => required(documents().ofrece["documentos-fiscales"]);
const withOffer = (offer: ContractOffer): ContractPackage => ({
  ...documents(),
  ofrece: { "documentos-fiscales": offer },
});
const action = () => required(offered().acciones.emitir);
const object = () => required(offered().objetos.comprobante);
const notice = () => required(offered().avisos.emitido);
const programs = (offer: ContractOffer) => [sales(), withOffer(offer)];
const exact = (actual: readonly string[], expected: readonly string[]) =>
  expect([...new Set(actual)].sort()).toEqual([...expected].sort());
const isolated = [
  [
    "01 input",
    () =>
      programs({
        ...offered(),
        acciones: {
          emitir: { ...action(), entrada: Type.Object({ venta: Type.Number() }, { additionalProperties: false }) },
        },
      }),
    [`${path}/acciones/emitir/entrada.venta:valor-incompatible`],
  ],
  ["02 action missing", () => programs({ ...offered(), acciones: {} }), [`${path}/acciones/emitir:ausente`]],
  [
    "03 object field",
    () =>
      programs({
        ...offered(),
        objetos: {
          comprobante: {
            ...object(),
            datos: Type.Object({ numero: Type.Number(), estado: Type.Literal("emitido") }),
          },
        },
      }),
    [`${path}/objetos/comprobante/datos.numero:valor-incompatible`],
  ],
  [
    "04 notice field",
    () =>
      programs({
        ...offered(),
        avisos: {
          emitido: { ...notice(), datos: Type.Object({ venta: Type.Number(), comprobante: Type.String() }) },
        },
      }),
    [`${path}/avisos/emitido/datos.venta:valor-incompatible`],
  ],
  ["05 notice missing", () => programs({ ...offered(), avisos: {} }), [`${path}/avisos/emitido:ausente`]],
  [
    "06 optional field",
    () =>
      programs({
        ...offered(),
        objetos: {
          comprobante: {
            ...object(),
            datos: Type.Object({ numero: Type.Optional(Type.String()), estado: Type.Literal("emitido") }),
          },
        },
      }),
    [`${path}/objetos/comprobante/datos.numero:puede-faltar`],
  ],
  [
    "07 union variant",
    () =>
      programs({
        ...offered(),
        objetos: {
          comprobante: {
            ...object(),
            datos: Type.Object({
              numero: Type.String(),
              estado: Type.Union([Type.Literal("emitido"), Type.Literal("pendiente")]),
            }),
          },
        },
      }),
    [`${path}/objetos/comprobante/datos.estado:valor-incompatible`],
  ],
  [
    "08 new rejection",
    () =>
      programs({
        ...offered(),
        acciones: {
          emitir: {
            ...action(),
            rechazos: Type.Object({ codigo: Type.Union([Type.Literal("invalida"), Type.Literal("duplicada")]) }),
          },
        },
      }),
    [`${path}/acciones/emitir/rechazos.codigo:valor-incompatible`],
  ],
  ["09 no provider", () => [sales()], [`sin-proveedor:${path}`]],
  [
    "10 two providers",
    () => [
      sales(),
      documents(),
      {
        ...documents(),
        id: "otro",
        hechos: ["otro/emitido"],
        ofrece: {
          "documentos-fiscales": {
            ...offered(),
            avisos: { emitido: { ...notice(), hecho: "otro/emitido" } },
          },
        },
      },
    ],
    [`dos-o-mas-proveedores:${path}`],
  ],
  ["13 DESERT version", () => [sales(), { ...documents(), desert: 2 }], ["contrato-desert:documentos"]],
  [
    "14 repeated program",
    () => [
      { ...sales(), id: "x", pide: {} },
      { ...sales(), id: "x", pide: {} },
    ],
    ["id-repetido:x"],
  ],
  [
    "15 repeated fact",
    () => [sales(), { ...documents(), hechos: ["documentos/emitido", "documentos/emitido"] }],
    ["hecho-repetido:documentos/emitido"],
  ],
  [
    "16 foreign fact",
    () => [sales(), { ...documents(), hechos: ["documentos/emitido", "ajeno/x"] }],
    ["hecho-ajeno:ajeno/x"],
  ],
  [
    "17 foreign action",
    () => programs({ ...offered(), acciones: { emitir: { ...action(), ruta: "fiscal/borrar" } } }),
    ["documentos/documentos-fiscales/acciones/emitir:ruta-ajena:fiscal/borrar"],
  ],
  [
    "18 missing projector",
    () => programs({ ...offered(), objetos: { comprobante: { ...object(), proyector: "otro" } } }),
    ["documentos/documentos-fiscales/objetos/comprobante:proyector-ausente:otro"],
  ],
] satisfies readonly [string, () => readonly ContractPackage[], readonly string[]][];
describe("isolated runtime negatives from dist-2", () => {
  it.each(isolated)("%s", (_name, setup, expected) => {
    exact(structuralContractErrors(setup()), expected);
  });
  it("24 cycle reports exactly both traversals", () => {
    const empty = { acciones: {}, objetos: {}, avisos: {} };
    exact(
      structuralContractErrors([
        { ...sales(), ofrece: { "ventas-publicas": { ...empty, version: "1.0.0" } } },
        { ...documents(), pide: { "ventas-publicas": { ...empty, casos: [] } } },
      ]),
      [
        "ciclo:ventas-[documentos-fiscales]->documentos-[ventas-publicas]->ventas",
        "ciclo:documentos-[ventas-publicas]->ventas-[documentos-fiscales]->documentos",
      ],
    );
  });
  it("11 new case and 12 evidence for another offer each report only their own missing case", async () => {
    const original = [sales(), documents()],
      build = { core: "C", executor: "E" };
    const gate = await runContractCases({
      programs: original,
      provider: "documentos",
      consumer: "ventas",
      contract: "documentos-fiscales",
      build,
      prepare: preparation => contractHouse(undefined, ":memory:", contractSelections(preparation)),
    });
    const consumer = sales(),
      request = required(consumer.pide["documentos-fiscales"]);
    const more = {
      ...consumer,
      pide: {
        "documentos-fiscales": { ...request, casos: [...request.casos, { ...required(request.casos[0]), id: "otro" }] },
      },
    };
    exact(validateContractPrograms([more, documents()], build, gate.evidence, gate.verify).errors, [
      `${path}/casos/otro:caso-no-declarado`,
    ]);
    exact(
      validateContractPrograms(programs({ ...offered(), version: "1.2.0" }), build, gate.evidence, gate.verify).errors,
      [`${path}/casos/emitir-y-leer:caso-no-declarado`],
    );
  });
  it("lists three independent incompatible fields without losing a reason", () => {
    exact(
      structuralContractErrors(
        programs({
          ...offered(),
          acciones: {
            emitir: { ...action(), entrada: Type.Object({ venta: Type.Number() }, { additionalProperties: false }) },
          },
          objetos: {
            comprobante: {
              ...object(),
              datos: Type.Object({ numero: Type.Number(), estado: Type.Literal("emitido") }),
            },
          },
          avisos: {
            emitido: { ...notice(), datos: Type.Object({ venta: Type.Number(), comprobante: Type.String() }) },
          },
        }),
      ),
      [
        `${path}/acciones/emitir/entrada.venta:valor-incompatible`,
        `${path}/objetos/comprobante/datos.numero:valor-incompatible`,
        `${path}/avisos/emitido/datos.venta:valor-incompatible`,
      ],
    );
  });
  it("does not mistake unsupported unused schemas for an optional extension", () => {
    exact(
      structuralContractErrors(
        programs({
          ...offered(),
          acciones: {
            emitir: action(),
            extra: {
              ruta: "fiscal/emitir",
              entrada: input(),
              salida: Type.String({ pattern: "x" }),
              rechazos: rejection(),
            },
          },
          objetos: { comprobante: { ...object(), datos: receipt() } },
        }),
      ),
      ["documentos/documentos-fiscales/acciones/extra/salida:esquema-no-soportado"],
    );
  });
});
