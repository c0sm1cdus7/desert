// Contract halves compare in the right direction: wider offers, missing members, constraints and unions.
import { Type, type TSchema } from "@sinclair/typebox";
import type { ContractAction } from "../../tools/contracts/contract-types.ts";
import { describe, expect, it } from "vitest";
import { compareContracts } from "./compare-contracts.ts";

const action = (
  entry: TSchema = Type.Object({ venta: Type.String() }, { additionalProperties: false }),
): ContractAction => ({
  entrada: entry,
  salida: Type.Object({ id: Type.String() }),
  rechazos: Type.Object({ codigo: Type.Literal("invalida") }),
});
const iface = () => ({ acciones: { emitir: action() }, objetos: {}, avisos: {} });
describe("contract halves", () => {
  it("accepts wider offered input and ignores unrequested output fields during comparison", () => {
    const offer = iface();
    offer.acciones.emitir = {
      ...action(
        Type.Object({ venta: Type.String(), nota: Type.Optional(Type.String()) }, { additionalProperties: false }),
      ),
      salida: Type.Object({ id: Type.String(), numero: Type.String() }),
    };
    expect(compareContracts(iface(), offer, "ventas/documentos")).toEqual([]);
  });
  it("lists all missing and incompatible members exactly", () => {
    const request = {
      ...iface(),
      avisos: { emitido: { datos: Type.Object({ venta: Type.String() }), lectura: "casa" as const } },
    };
    const offer = {
      ...iface(),
      acciones: { emitir: action(Type.Object({ venta: Type.Number() }, { additionalProperties: false })) },
    };
    expect(compareContracts(request, offer, "ventas/documentos")).toEqual([
      "ventas/documentos/acciones/emitir/entrada.venta:valor-incompatible",
      "ventas/documentos/avisos/emitido:ausente",
    ]);
  });
  it("rejects unsupported constraints rather than accepting them", () => {
    const offer = {
      ...iface(),
      acciones: {
        emitir: action(Type.Object({ venta: Type.String({ pattern: "x" }) }, { additionalProperties: false })),
      },
    };
    expect(compareContracts(iface(), offer, "v/d")).toEqual(["v/d/acciones/emitir/entrada.venta:esquema-no-soportado"]);
  });
});

it("checks optional fields, unions and list elements in the correct direction", () => {
  const request = {
    acciones: {},
    avisos: {},
    objetos: {
      comprobante: {
        clave: Type.String(),
        lectura: "casa" as const,
        datos: Type.Object({
          numero: Type.String(),
          estado: Type.Union([Type.Literal("emitido"), Type.Literal("anulado")]),
          lineas: Type.Array(Type.String()),
        }),
      },
    },
  };
  const offer = {
    ...request,
    objetos: {
      comprobante: {
        ...request.objetos.comprobante,
        datos: Type.Object({
          numero: Type.Optional(Type.String()),
          estado: Type.Union([Type.Literal("emitido"), Type.Literal("pendiente")]),
          lineas: Type.Array(Type.Number()),
        }),
      },
    },
  };
  expect(compareContracts(request, offer, "v/d")).toEqual([
    "v/d/objetos/comprobante/datos.numero:puede-faltar",
    "v/d/objetos/comprobante/datos.estado:valor-incompatible",
    "v/d/objetos/comprobante/datos.lineas[]:valor-incompatible",
  ]);
});
it("does not combine separate union branches into a manufactured match", () => {
  const request = {
    ...iface(),
    acciones: {
      emitir: {
        ...action(),
        salida: Type.Union([
          Type.Object({ a: Type.String(), b: Type.String() }),
          Type.Object({ c: Type.String(), d: Type.String() }),
        ]),
      },
    },
  };
  const offer = {
    ...iface(),
    acciones: { emitir: { ...action(), salida: Type.Object({ a: Type.String(), c: Type.String() }) } },
  };
  expect(compareContracts(request, offer, "v/d")).toEqual(["v/d/acciones/emitir/salida:valor-incompatible"]);
});
