import { expect, it } from "vitest";
import { diagnoseContracts } from "./contract-graph.ts";
const empty = { actions: {}, objects: {}, notices: {} };
it("reports absent and ambiguous providers without picking one", () => {
  expect(
    diagnoseContracts([
      { id: "sales", offers: {}, requests: { fiscal: empty, missing: empty } },
      { id: "a", offers: { fiscal: empty }, requests: {} },
      { id: "b", offers: { fiscal: empty }, requests: {} },
    ]),
  ).toEqual(["multiple-providers:sales/fiscal", "no-provider:sales/missing"]);
});
it("reports both complete routes through a cycle", () => {
  expect(
    diagnoseContracts([
      { id: "a", offers: { x: empty }, requests: { y: empty } },
      { id: "b", offers: { y: empty }, requests: { x: empty } },
    ]),
  ).toEqual(["cycle:a-[y]->b-[x]->a", "cycle:b-[x]->a-[y]->b"]);
});
