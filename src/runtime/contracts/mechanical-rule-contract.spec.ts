// A call between programs keeps the actor and goes through the provider's rules.
import { expect, it } from "vitest";
import { contractHouse, documents, sales } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { startTools } from "../../tools/start.ts";
import { effect } from "../../house/facts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
it("holds the published action without emitting the provider's facts", async () => {
  const house = contractHouse();
  const runtime = createContractRuntime([sales(), documents()], house.ports, house.history);
  const engine = startTools({
    ...house.ports,
    history: house.history.events(house.ports.state().through),
    contracts: runtime.context,
  });
  try {
    house.ports.bus.emit(
      effect(
        "rule-versioned",
        {
          version: 1,
          previous: null,
          definition: {
            id: "documents",
            text: "No emitir",
            action: { tool: "documents", act: "fiscal/issue" },
            condition: { operator: "actor", kind: "identity" },
            effect: "block",
          },
        },
        "ana",
      ),
    );
    for (const target of ["sales/billing", "documents/fiscal"])
      engine.act({ act: "attend", input: { target } }, 0, "beto");
    const result = await settle(
      engine.act({ act: "billing/invoice", target: "sales/billing", input: { sale: "v1" } }, 0, "beto"),
    );
    expect(result.value).toEqual({ status: "core-failure", reason: "forbidden" });
    expect(house.events().filter(event => event.kind === "documents/issued")).toEqual([]);
    expect(house.events().filter(event => event.kind === "rule-evaluated")).toMatchObject([
      { by: "beto", data: { results: [{ outcome: "block" }] } },
    ]);
  } finally {
    engine.stop();
    house.close();
  }
});
