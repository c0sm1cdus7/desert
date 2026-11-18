import "../../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { componer } from "./compose.ts";
import { startHouse } from "../house-runtime.ts";
import { home, time } from "../../../tests/support/upgrade-support.ts";
import { contractOptions, type Demo } from "../../../tests/support/distribution-contracts.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { input } from "../../../tests/support/contract-packages.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import type { ActResult } from "../../tools/tool-contract.ts";

function setup(override?: () => ActResult<Demo> | Promise<ActResult<Demo>>) {
  const path = home();
  const { program } = componer(contractOptions);
  const registry = program.registry.map(tool => {
    const action = tool.acts["fiscal/emitir"];
    return override && action
      ? {
          ...tool,
          acts: {
            ...tool.acts,
            "fiscal/emitir": {
              ...toolAct<Demo, ReturnType<typeof input>>(input(), override),
              folder: "documentos/fiscal",
              on: "thing" as const,
            },
          },
        }
      : tool;
  });
  const options = {
    ...program,
    registry,
    by: "demo",
    creation: {
      admin: "ana",
      assignments: ["ana", "beto"].map(identity => ({ identity, tools: ["ventas", "documentos"] })),
    },
  };
  const open = () => startHouse(path, options, time);
  const house = open();
  for (const target of ["ventas/facturacion", "documentos/fiscal"])
    house.tools.act({ act: "attend", input: { target } }, 0, "beto");
  return {
    house,
    open,
    act: (venta = "v1") =>
      house.tools.act({ act: "facturacion/facturar", target: "ventas/facturacion", input: { venta } }, 0, "beto"),
  };
}
it("executes certified contracts through startHouse and preserves their receipts on reopen", async () => {
  const rig = setup();
  try {
    expect((await settle(rig.act())).value).toEqual({ status: "accepted", value: { id: "v1" } });
    expect(rig.house.tools.state().tools.documentos.fiscal.get("v1")).toMatchObject({ numero: "1" });
    const events = rig.house.journal.replay<import("../../journal/vocabulary.ts").Event<Demo["fact"]>[]>(
      [],
      (all, event) => [...all, event],
    );
    const consumer = events.find(e => e.kind === "act" && e.data.option === "facturacion/facturar");
    const provider = events.find(e => e.kind === "act" && e.data.option === "fiscal/emitir");
    expect(provider?.cause).toContain(consumer?.id);
    expect(events.find(e => e.kind === "documentos/emitido")?.cause).toContain(provider?.id);
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: "documentos/emitido",
        by: "beto",
      }),
    );
  } finally {
    rig.house.close();
  }
  const reopened = rig.open();
  try {
    expect(reopened.tools.state().tools.documentos.fiscal.get("v1")).toMatchObject({ numero: "1" });
    const read = await settle(
      reopened.tools.act({ act: "facturacion/leer", target: "ventas/facturacion", input: { venta: "v1" } }, 0, "beto"),
    );
    expect(read.value).toMatchObject({
      reading: { status: "found", value: { numero: "1", estado: "emitido" } },
      notices: [{ author: "beto", value: { venta: "v1", comprobante: "v1" } }],
    });
    expect(JSON.stringify(read.value)).not.toContain("privado");
  } finally {
    reopened.close();
  }
});
it("preserves business refusal through the public opening", async () => {
  const rig = setup();
  try {
    expect((await settle(rig.act("invalid"))).value).toEqual({ status: "rejected", value: { codigo: "invalida" } });
  } finally {
    rig.house.close();
  }
});
it("preserves inconclusive provider results", async () => {
  const rig = setup(() => ({ status: "inconclusive" }));
  try {
    expect((await settle(rig.act())).value).toEqual({ status: "core-failure", reason: "inconclusive" });
  } finally {
    rig.house.close();
  }
});
it.each(["revoke", "close"])("interrupts a provider waiting during %s", async mode => {
  let finish: ((result: ActResult<Demo>) => void) | undefined;
  const rig = setup(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  try {
    const pending = rig.act();
    expect(pending.status).toBe("processing");
    if (mode === "close") rig.house.close();
    else
      rig.house.bus.emit(
        effect(
          "kit-set",
          { version: 2, holder: "beto", kit: { version: 2, selections: [{ kind: "program", program: "ventas" }] } },
          "ana",
        ),
      );
    finish?.({
      status: "accepted",
      value: { id: "v1", numero: "1" },
      effects: [
        {
          layer: "program",
          kind: "documentos/emitido",
          data: { venta: "v1", comprobante: "v1" },
          by: "beto",
          cause: [],
        },
      ],
    });
    const result = await settle(pending);
    if (mode === "close") expect(result.status).toBe("interrupted");
    else expect(result.value).toEqual({ status: "core-failure", reason: "interrupted" });
  } finally {
    rig.house.close();
  }
  const reopened = rig.open();
  try {
    expect(reopened.tools.state().tools.documentos.fiscal.size).toBe(0);
    if (mode === "close")
      expect(
        reopened.journal.replay<number>(
          0,
          (count, event) => count + Number(event.kind === "act-result" && event.data.status === "interrupted"),
        ),
      ).toBe(2);
  } finally {
    reopened.close();
  }
});

it("refuses revoked provider permissions before dispatch", async () => {
  const rig = setup();
  try {
    rig.house.bus.emit(
      effect(
        "kit-set",
        { version: 2, holder: "beto", kit: { version: 2, selections: [{ kind: "program", program: "ventas" }] } },
        "ana",
      ),
    );
    expect((await settle(rig.act())).value).toEqual({ status: "core-failure", reason: "forbidden" });
    expect(rig.house.tools.state().tools.documentos.fiscal.size).toBe(0);
  } finally {
    rig.house.close();
  }
});
it("rejects a certified declaration whose installed executor is missing", () => {
  const [sales, documents] = contractOptions.programas;
  const missing = {
    ...documents,
    install: () => {
      const installed = documents.install();
      return { ...installed, tool: { ...installed.tool, acts: {} } };
    },
  };
  expect(() => componer({ ...contractOptions, programas: [sales, missing] })).toThrow();
});
