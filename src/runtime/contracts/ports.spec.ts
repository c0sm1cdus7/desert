import { describe, expect, it } from "vitest";
import { contractHouse, documents, sales } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { startTools } from "../../tools/start.ts";
import { effect } from "../../house/facts.ts";

async function run(by = "beto", denied = false) {
  const house = contractHouse();
  const runtime = createContractRuntime([sales(), documents()], house.ports, house.history);
  const engine = startTools({ ...house.ports, contracts: runtime.context });
  for (const target of ["ventas/facturacion", "documentos/fiscal"])
    engine.act({ act: "attend", input: { target } }, house.ports.state().through, by);
  if (denied)
    house.ports.bus.emit(
      effect(
        "kit-set",
        {
          holder: by,
          tool: "documentos/fiscal",
          acts: [],
        },
        "ana",
      ),
    );
  const started = engine.act({ act: "facturar", target: "ventas/facturacion", input: { venta: "v1" } }, 0, by);
  const result = started.status === "processing" ? await started.completion : started;
  const events = house.events();
  engine.stop();
  house.close();
  return { result, events };
}
describe("the contractual action port", () => {
  it("routes two programs through the common executor with the caller and trims the response", async () => {
    const { result, events } = await run();
    expect(result.value).toEqual({ status: "accepted", value: { id: "v1" } });
    expect(events.filter(event => event.kind === "documentos/emitido").map(event => event.by)).toEqual(["beto"]);
    const acts = events.filter(event => event.kind === "act");
    const parent = acts.find(event => event.data.option === "facturar");
    const child = acts.find(event => event.data.option === "emitir");
    expect(child?.cause).toContain(parent?.id);
  });
  it("does not inherit the provider's or administrator's permissions", async () => {
    const { result, events } = await run("beto", true);
    expect(result.value).toEqual({ status: "core-failure", reason: "forbidden" });
    expect(events.filter(event => event.kind === "documentos/emitido")).toEqual([]);
  });
});
