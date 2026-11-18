import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contractHouse, documents, sales, required } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { startTools } from "../../tools/start.ts";
function start(path = ":memory:") {
  const house = contractHouse(undefined, path);
  const runtime = createContractRuntime([sales(), documents()], house.ports, house.history);
  const engine = startTools({
    ...house.ports,
    history: house.history.events(house.ports.state().through),
    contracts: runtime.context,
  });
  for (const by of ["beto", "ana"])
    for (const tool of house.ports.registry) engine.act({ act: "attend", input: { target: tool.id } }, 0, by);
  const act = async (by: string, sale: string) => {
    const result = engine.act(
      { act: "facturacion/facturar", target: "ventas/facturacion", input: { venta: sale } },
      0,
      by,
    );
    return result.status === "processing" ? await result.completion : result;
  };
  const scope = () =>
    runtime.open("ventas", {
      tool: "ventas",
      by: "beto",
      execute: async action => {
        const result = engine.act(action, 0, "beto");
        return result.status === "processing" ? await result.completion : result;
      },
    });
  return {
    ...house,
    runtime,
    engine,
    act,
    scope,
    stop: () => {
      engine.stop();
      house.close();
    },
  };
}
it("reopens an older journal and reconstructs the exact notice cut without running its actions again", async () => {
  const folder = mkdtempSync(join(tmpdir(), "desert-contract-history-"));
  const path = join(folder, "journal.sqlite");
  let sequence = 0;
  try {
    const first = start(path);
    try {
      await first.act("beto", "v1");
      sequence = required(first.events().find(event => event.kind === "documentos/emitido")).seq;
      await first.act("beto", "v2");
    } finally {
      first.stop();
    }
    const reopened = start(path);
    try {
      const port = required(reopened.scope().contracts["documentos-fiscales"]);
      expect(port.objects.comprobante?.read("v1", reopened.runtime.cut(sequence))).toMatchObject({
        status: "found",
        sequence,
        value: { numero: "1", estado: "emitido" },
      });
      expect(port.objects.comprobante?.read("v2", reopened.runtime.cut(sequence))).toEqual({
        status: "unavailable",
        sequence,
      });
      expect(reopened.events().filter(event => event.kind === "documentos/emitido")).toHaveLength(2);
    } finally {
      reopened.stop();
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
it("concurrent callers keep independent actors and causes through the same provider", async () => {
  const rig = start();
  try {
    const results = await Promise.all([rig.act("beto", "v1"), rig.act("ana", "v2")]);
    expect(results.map(result => result.value)).toEqual([
      { status: "accepted", value: { id: "v1" } },
      { status: "accepted", value: { id: "v2" } },
    ]);
    expect(
      rig
        .events()
        .filter(event => event.kind === "documentos/emitido")
        .map(event => event.by),
    ).toEqual(["beto", "ana"]);
    for (const event of rig.events().filter(event => event.kind === "documentos/emitido")) {
      const origin = rig.events().find(parent => event.cause.includes(parent.id) && parent.kind === "act");
      expect(origin?.by).toBe(event.by);
    }
  } finally {
    rig.stop();
  }
});
