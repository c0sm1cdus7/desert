import { describe, expect, it } from "vitest";
import { contractHouse, documents, sales, type Demo } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { startTools } from "../../tools/start.ts";
import { effect } from "../../house/facts.ts";
import type { ActResult } from "../../tools/tool-contract.ts";
import type { ContractPort } from "../../tools/contract-port.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { Type } from "@sinclair/typebox";

function setup(override?: () => ActResult<Demo> | Promise<ActResult<Demo>>) {
  const house = contractHouse(override);
  const runtime = createContractRuntime([sales(), documents()], house.ports, house.history);
  const engine = startTools({ ...house.ports, contracts: runtime.context });
  for (const target of ["ventas/facturacion", "documentos/fiscal"])
    engine.act({ act: "attend", input: { target } }, 0, "beto");
  const act = (sale = "v1") =>
    engine.act({ act: "facturar", target: "ventas/facturacion", input: { venta: sale } }, 0, "beto");
  return {
    ...house,
    engine,
    act,
    stop: () => {
      engine.stop();
      house.close();
    },
  };
}
describe("core failures stay distinct from business refusals", () => {
  it.each([
    [{ status: "inconclusive" }, "inconclusive"],
    [{ status: "interrupted", reason: "corte" }, "interrupted"],
    [{ status: "accepted", value: { id: 2 } }, "defect"],
    [{ status: "rejected", reason: "no declarado", value: { codigo: "otro" } }, "defect"],
  ] satisfies readonly [ActResult<Demo>, string][])("preserves %s as %s", async (response, reason) => {
    const rig = setup(() => response);
    try {
      const started = rig.act();
      const result = started.status === "processing" ? await started.completion : started;
      expect(result.value).toEqual({ status: "core-failure", reason });
    } finally {
      rig.stop();
    }
  });
  it("preserves declared structured business refusal", async () => {
    const rig = setup();
    try {
      const started = rig.act("invalid");
      const result = started.status === "processing" ? await started.completion : started;
      expect(result.value).toEqual({ status: "rejected", value: { codigo: "invalida" } });
    } finally {
      rig.stop();
    }
  });
  it("does not write a late result when the provider permission is withdrawn while waiting", async () => {
    let finish: ((result: ActResult<Demo>) => void) | undefined;
    const rig = setup(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    try {
      const started = rig.act();
      expect(started.status).toBe("processing");
      rig.ports.bus.emit(effect("kit-set", { holder: "beto", tool: "documentos/fiscal", acts: [] }, "ana"));
      finish?.({ status: "accepted", value: { id: "v1", numero: "1" } });
      const result = started.status === "processing" ? await started.completion : started;
      expect(result.value).toEqual({ status: "core-failure", reason: "interrupted" });
      expect(rig.events().filter(e => e.kind === "documentos/emitido")).toEqual([]);
    } finally {
      rig.stop();
    }
  });
  it("a stopped house reports interruption instead of rejection", async () => {
    let finish: ((result: ActResult<Demo>) => void) | undefined;
    const rig = setup(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    try {
      const started = rig.act();
      rig.engine.stop();
      finish?.({ status: "accepted", value: { id: "v1", numero: "1" } });
      const result = started.status === "processing" ? await started.completion : started;
      expect(result.status).toBe("interrupted");
    } finally {
      rig.close();
    }
  });
  it("a retained action port stops working when its calling action ends", async () => {
    const house = contractHouse();
    let retained: ContractPort | undefined;
    const registry = house.ports.registry.map(tool =>
      tool.id !== "ventas/facturacion"
        ? tool
        : {
            ...tool,
            acts: {
              facturar: toolAct<Demo, ReturnType<typeof Type.Null>>(Type.Null(), (_input, context) => {
                retained = context.contracts?.["documentos-fiscales"];
                return { status: "accepted" };
              }),
            },
          },
    );
    const ports = { ...house.ports, registry };
    const runtime = createContractRuntime([sales(), documents()], ports, house.history);
    const engine = startTools({ ...ports, contracts: runtime.context });
    try {
      engine.act({ act: "attend", input: { target: "ventas/facturacion" } }, 0, "beto");
      engine.act({ act: "facturar", target: "ventas/facturacion", input: null }, 0, "beto");
      expect(await retained?.actions.emitir?.({ venta: "v1" })).toEqual({
        status: "core-failure",
        reason: "interrupted",
      });
      expect(retained?.objects.comprobante?.read("v1", runtime.cut())).toEqual({
        status: "core-failure",
        reason: "forbidden",
      });
    } finally {
      engine.stop();
      house.close();
    }
  });
});
