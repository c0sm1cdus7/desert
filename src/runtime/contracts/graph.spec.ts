import { expect, it } from "vitest";
import { diagnoseContracts } from "./contract-graph.ts";
const empty = { acciones: {}, objetos: {}, avisos: {} };
it("reports absent and ambiguous providers without picking one", () => {
  expect(
    diagnoseContracts([
      { id: "ventas", ofrece: {}, pide: { fiscal: empty, faltante: empty } },
      { id: "a", ofrece: { fiscal: empty }, pide: {} },
      { id: "b", ofrece: { fiscal: empty }, pide: {} },
    ]),
  ).toEqual(["dos-o-mas-proveedores:ventas/fiscal", "sin-proveedor:ventas/faltante"]);
});
it("reports both complete routes through a cycle", () => {
  expect(
    diagnoseContracts([
      { id: "a", ofrece: { x: empty }, pide: { y: empty } },
      { id: "b", ofrece: { y: empty }, pide: { x: empty } },
    ]),
  ).toEqual(["ciclo:a-[y]->b-[x]->a", "ciclo:b-[x]->a-[y]->b"]);
});
