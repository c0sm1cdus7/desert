import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { contractHouse, documents, sales, required } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { validateContractPrograms } from "./validate-contracts.ts";
import { schemaInclusion } from "./schema-inclusion.ts";
import { compareContracts } from "./compare-contracts.ts";

it.each(["notas", "documentos"])("19/20 does not lend the undeclared contract %s", name => {
  const house = contractHouse();
  try {
    const runtime = createContractRuntime([sales(), documents()], house.ports, house.history);
    const scope = runtime.open("ventas", {
      tool: "ventas/facturacion",
      by: "beto",
      execute: () => Promise.resolve({ status: "inconclusive" }),
    });
    expect(Object.keys(scope.contracts)).toEqual(["documentos-fiscales"]);
    expect(scope.contracts[name]).toBeUndefined();
  } finally {
    house.close();
  }
});
it("cannot acquire inherited members or mutate the installed contract through retained declarations", () => {
  const house = contractHouse(),
    consumer = sales();
  try {
    const runtime = createContractRuntime([consumer, documents()], house.ports, house.history);
    const scope = runtime.open("ventas", {
      tool: "ventas/facturacion",
      by: "beto",
      execute: () => Promise.resolve({ status: "accepted", value: { id: "v1", numero: "1" } }),
    });
    expect(scope.contracts.constructor).toBeUndefined();
    const port = required(scope.contracts["documentos-fiscales"]);
    expect(port.actions.constructor).toBeUndefined();
    expect(port.objects.constructor).toBeUndefined();
    const requested = required(consumer.pide["documentos-fiscales"]);
    Reflect.deleteProperty(requested.acciones, "emitir");
    expect(Object.keys(port.actions)).toEqual(["emitir"]);
    expect(Reflect.deleteProperty(port.actions, "emitir")).toBe(false);
  } finally {
    house.close();
  }
});
it("an empty case list stays unchecked and blocks distribution approval", () => {
  const consumer = sales(),
    request = required(consumer.pide["documentos-fiscales"]);
  const result = validateContractPrograms(
    [{ ...consumer, pide: { "documentos-fiscales": { ...request, casos: [] } } }, documents()],
    { core: "C", executor: "E" },
  );
  expect(result.errors).toEqual(["ventas/documentos-fiscales/casos:casos-no-comprobados"]);
  expect(result.rows[0]?.status).toBe("casos no comprobados");
});
it("rejects recursive schemas and never resolves an inherited action as an offer", () => {
  const schema = Type.Object({});
  Reflect.set(schema.properties, "recursive", schema);
  const errors = schemaInclusion(schema, Type.Object({}), "root", "lectura");
  expect(errors).toHaveLength(1);
  expect(errors[0]?.endsWith(":esquema-no-soportado")).toBe(true);
  const request = required(sales().pide["documentos-fiscales"]);
  const need = required(request.acciones.emitir);
  expect(
    compareContracts(
      { acciones: { constructor: need }, objetos: {}, avisos: {} },
      { acciones: {}, objetos: {}, avisos: {} },
      "v/d",
    ),
  ).toEqual(["v/d/acciones/constructor:ausente"]);
});
