import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { contractHouse, documents, sales, required } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { validateContractPrograms } from "./validate-contracts.ts";
import { schemaInclusion } from "./schema-inclusion.ts";
import { compareContracts } from "./compare-contracts.ts";

it.each(["notes", "documents"])("19/20 does not lend the undeclared contract %s", name => {
  const house = contractHouse();
  try {
    const runtime = createContractRuntime([sales(), documents()], house.ports, house.history);
    const scope = runtime.open("sales", {
      tool: "sales",
      by: "beto",
      execute: () => Promise.resolve({ status: "inconclusive" }),
    });
    expect(Object.keys(scope.contracts)).toEqual(["fiscal-documents"]);
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
    const scope = runtime.open("sales", {
      tool: "sales",
      by: "beto",
      execute: () => Promise.resolve({ status: "accepted", value: { id: "v1", number: "1" } }),
    });
    expect(scope.contracts.constructor).toBeUndefined();
    const port = required(scope.contracts["fiscal-documents"]);
    expect(port.actions.constructor).toBeUndefined();
    expect(port.objects.constructor).toBeUndefined();
    const requested = required(consumer.requests["fiscal-documents"]);
    Reflect.deleteProperty(requested.actions, "issue");
    expect(Object.keys(port.actions)).toEqual(["issue"]);
    expect(Reflect.deleteProperty(port.actions, "issue")).toBe(false);
  } finally {
    house.close();
  }
});
it("an empty case list stays unchecked and blocks distribution approval", () => {
  const consumer = sales(),
    request = required(consumer.requests["fiscal-documents"]);
  const result = validateContractPrograms(
    [{ ...consumer, requests: { "fiscal-documents": { ...request, cases: [] } } }, documents()],
    { core: "C", executor: "E" },
  );
  expect(result.errors).toEqual(["sales/fiscal-documents/cases:unchecked-cases"]);
  expect(result.rows[0]?.status).toBe("unchecked cases");
});
it("rejects recursive schemas and never resolves an inherited action as an offer", () => {
  const schema = Type.Object({});
  Reflect.set(schema.properties, "recursive", schema);
  const errors = schemaInclusion(schema, Type.Object({}), "root", "reading");
  expect(errors).toHaveLength(1);
  expect(errors[0]?.endsWith(":unsupported-schema")).toBe(true);
  const request = required(sales().requests["fiscal-documents"]);
  const need = required(request.actions.issue);
  expect(
    compareContracts(
      { actions: { constructor: need }, objects: {}, notices: {} },
      { actions: {}, objects: {}, notices: {} },
      "v/d",
    ),
  ).toEqual(["v/d/actions/constructor:missing"]);
});
