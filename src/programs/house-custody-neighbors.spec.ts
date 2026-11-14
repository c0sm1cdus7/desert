import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported } from "../../tests/support/declared-adapters.ts";
import type { ToolStartup } from "../tools/startup-contract.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { toolAct } from "../tools/act-definition.ts";
const empty = Type.Object({});
for (const together of [false, true])
  it(`el arranque revierte el vínculo si un oyente falla al escribir el lote: together=${together}`, async () => {
    let ports: ToolStartup<Shop> | undefined;
    const rig = adapterHouse(
      {},
      {
        start: current => {
          ports = current;
          return () => {};
        },
      },
    );
    if (!ports) throw new Error("fixture");
    const startup = ports,
      refs = await imported(startup);
    const stop = rig.bus().on("tool-entry", event => {
      const detail = event.data.detail;
      if (detail && typeof detail === "object" && "custodyBatch" in detail) throw new Error("oyente roto");
    });
    const write = () => startup.bus.emit(startup.credentials.replace("signing", refs, 0));
    expect(() => (together ? startup.bus.together(write) : write())).toThrow();
    expect(JSON.stringify(rig.facts())).not.toContain("credential-bound");
    stop();
    expect(write).not.toThrow();
    expect(JSON.stringify(rig.facts()).match(/credential-bound/gu)).toHaveLength(1);
    rig.restart();
  });
it("un aviso de ancla pendiente llega también a quien ejecutó una acción anidada", async () => {
  let fail = false,
    nested: unknown;
  const rig = adapterHouse({
    bind: toolAct(empty, async (_, ctx) => {
      const refs = await imported(ctx);
      fail = true;
      return { status: "accepted", effects: [ctx.credentials.replace("signing", refs, 0)] };
    }),
    nested: toolAct(empty, async (_, ctx) => {
      const result = await ctx.execute?.({ act: "bind", target: "vault", input: {} });
      nested = result;
      return result ?? { status: "rejected", reason: "sin acción" };
    }),
  });
  const anchor = rig.options.secretKeys.anchor.bind(rig.options.secretKeys);
  const spy = vi.spyOn(rig.options.secretKeys, "anchor").mockImplementation((house, head) => {
    if (fail) throw new Error("llavero sin respuesta");
    anchor(house, head);
  });
  try {
    expect(await rig.act("nested")).toMatchObject({ status: "accepted", anchorPending: true });
    expect(nested).toMatchObject({ status: "accepted", anchorPending: true });
    fail = false;
    rig.restart();
  } finally {
    spy.mockRestore();
  }
});
it("la vista se fija al empezar aunque su primera consulta llegue después de otra acción", async () => {
  let resume = () => {},
    ready = () => {};
  const waiting = new Promise<void>(resolve => {
    ready = resolve;
  });
  const rig = adapterHouse({
    bind: toolAct(empty, async (_, ctx) => ({
      status: "accepted",
      effects: [ctx.credentials.replace("signing", await imported(ctx), 0)],
    })),
    delayed: toolAct(empty, async (_, ctx) => {
      ready();
      await new Promise<void>(resolve => {
        resume = resolve;
      });
      expect(ctx.credentials.current("signing")).toBeUndefined();
      expect(ctx.credentials.revision("signing")).toBe(0);
      return { status: "accepted" };
    }),
  });
  const pending = rig.act("delayed");
  await waiting;
  expect((await rig.act("bind")).status).toBe("accepted");
  resume();
  expect((await pending).status).toBe("accepted");
});
