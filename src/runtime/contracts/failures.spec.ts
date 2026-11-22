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
  const engine = startTools({
    ...house.ports,
    history: house.history.events(house.ports.state().through),
    contracts: runtime.context,
  });
  for (const target of ["ventas/facturacion", "documentos/fiscal"])
    engine.act({ act: "attend", input: { target } }, 0, "beto");
  const act = (sale = "v1") =>
    engine.act({ act: "facturacion/facturar", target: "ventas/facturacion", input: { venta: sale } }, 0, "beto");
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
      rig.ports.bus.emit(
        effect(
          "kit-set",
          { version: 2, holder: "beto", kit: { version: 2, selections: [{ kind: "program", program: "ventas" }] } },
          "ana",
        ),
      );
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
      tool.id !== "ventas"
        ? tool
        : {
            ...tool,
            acts: {
              "facturacion/facturar": toolAct<Demo, ReturnType<typeof Type.Null>>(Type.Null(), (_input, context) => {
                retained = context.contracts?.["documentos-fiscales"];
                return { status: "accepted" };
              }),
            },
          },
    );
    const ports = { ...house.ports, registry };
    const runtime = createContractRuntime([sales(), documents()], ports, house.history);
    const engine = startTools({
      ...ports,
      history: house.history.events(ports.state().through),
      contracts: runtime.context,
    });
    try {
      engine.act({ act: "attend", input: { target: "ventas/facturacion" } }, 0, "beto");
      engine.act({ act: "facturacion/facturar", target: "ventas/facturacion", input: null }, 0, "beto");
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
describe("a refusal before running reaches the consumer as a business refusal when it fits", () => {
  const declared = <T extends ReturnType<typeof documents>>(half: T, side: "ofrece" | "pide"): T => {
    const contract = half[side]["documentos-fiscales"];
    const emitir = contract?.acciones.emitir;
    if (!contract || !emitir) throw new Error("missing fixture contract");
    const acciones = {
      emitir: {
        ...emitir,
        rechazos: Type.Union([emitir.rechazos, Type.Object({ reason: Type.Literal("sin fiscal") })]),
      },
    };
    return { ...half, [side]: { "documentos-fiscales": { ...contract, acciones } } };
  };
  function refusing(said: Readonly<{ offered?: string; stops?: string }>) {
    const house = contractHouse();
    const registry = house.ports.registry.map(tool => {
      const action = tool.acts["fiscal/emitir"];
      if (tool.id !== "documentos" || !action) return tool;
      const refusingAct = {
        ...action,
        offered: () => said.offered,
        stops: () => said.stops,
        refuses: ["sin fiscal", "otra cosa"],
      };
      return { ...tool, acts: { ...tool.acts, "fiscal/emitir": refusingAct } };
    });
    const ports = { ...house.ports, registry };
    const runtime = createContractRuntime(
      [declared(sales(), "pide"), declared(documents(), "ofrece")],
      ports,
      house.history,
    );
    const engine = startTools({
      ...ports,
      history: house.history.events(ports.state().through),
      contracts: runtime.context,
    });
    for (const target of ["ventas/facturacion", "documentos/fiscal"])
      engine.act({ act: "attend", input: { target } }, 0, "beto");
    return { engine, house };
  }
  it.each([
    [{ offered: "sin fiscal" }, { status: "rejected", value: { reason: "sin fiscal" } }],
    [{ offered: "otra cosa" }, { status: "core-failure", reason: "defect" }],
    [{ stops: "sin fiscal" }, { status: "rejected", value: { reason: "sin fiscal" } }],
    [{ stops: "otra cosa" }, { status: "core-failure", reason: "defect" }],
  ])("%o reaches the consumer as %o", async (said, expected) => {
    const { engine, house } = refusing(said);
    try {
      const started = engine.act(
        { act: "facturacion/facturar", target: "ventas/facturacion", input: { venta: "v1" } },
        0,
        "beto",
      );
      const result = started.status === "processing" ? await started.completion : started;
      expect(result.value).toEqual(expected);
      expect(house.events().filter(e => e.kind === "documentos/emitido")).toEqual([]);
    } finally {
      engine.stop();
      house.close();
    }
  });
  it("keeps a refusal of the kit a core failure even when its words would fit", async () => {
    const { engine, house } = refusing({});
    try {
      house.ports.bus.emit(
        effect(
          "kit-set",
          { version: 2, holder: "beto", kit: { version: 2, selections: [{ kind: "program", program: "ventas" }] } },
          "ana",
        ),
      );
      const started = engine.act(
        { act: "facturacion/facturar", target: "ventas/facturacion", input: { venta: "v1" } },
        0,
        "beto",
      );
      const result = started.status === "processing" ? await started.completion : started;
      expect(result.value).toEqual({ status: "core-failure", reason: "forbidden" });
    } finally {
      engine.stop();
      house.close();
    }
  });
});
