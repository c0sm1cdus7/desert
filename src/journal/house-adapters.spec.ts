import { expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { Type } from "@sinclair/typebox";
import { adapterHouse as setup } from "../../tests/support/adapter-house.ts";
import { imported, call, signer, synthetic } from "../../tests/support/declared-adapters.ts";
import type { ActContext } from "../tools/tool-contract.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { toolAct } from "../tools/act-definition.ts";
it("la acción recibe referencias de importación y usa el adaptador declarado después de reabrir", async () => {
  const rig = setup({
    set: toolAct(Type.Object({}), async (_, context) => {
      const refs = await imported(context);
      return {
        status: "accepted",
        text: "Guardado",
        effects: [context.credentials.replace("signing", refs, context.credentials.revision("signing"))],
      };
    }),
    send: toolAct(Type.Object({}), async (_, context) => {
      const held = context.credentials.current("signing");
      if (!held) return { status: "rejected", reason: "Falta credencial" };
      expect(await call(context, "inspect", held.refs)).toEqual({ valid: true });
      return { status: "accepted", text: "Enviado" };
    }),
  });
  expect((await rig.act("set")).status).toBe("accepted");
  rig.restart();
  expect((await rig.act("send")).status).toBe("accepted");
  expect((await rig.act("send", "child")).status).toBe("rejected");
  expect(JSON.stringify(rig.facts())).not.toContain(synthetic);
});
it("un error transformado del adaptador nunca llega a acción, resultado ni diagnóstico", async () => {
  const rig = setup(
    {
      send: toolAct(Type.Object({}), async (_, context) => {
        await call(context, "inspect", { key: "secret:invented" });
        return { status: "accepted" };
      }),
    },
    {},
    {
      signer: {
        ...signer,
        open: () => ({
          inspect: () => {
            throw new Error(synthetic.replaceAll("\n", "|"), { cause: new Error(synthetic) });
          },
        }),
      },
    },
  );
  const done = await rig.act("send");
  expect(done.status).not.toBe("accepted");
  expect(JSON.stringify([done, rig.facts()])).not.toContain("MATERIAL_INVENTADO");
  expect(JSON.stringify(rig.facts())).toContain("E-ADAPTER-FAILED");
});
it("el arranque recibe solo capacidades públicas; su cierre y el fin de la acción las revocan", async () => {
  const seen: ActContext<Shop>[] = [];
  const startup: unknown[] = [];
  const rig = setup(
    {
      set: toolAct(Type.Object({}), (_, context) => {
        seen.push(context);
        return { status: "accepted" };
      }),
    },
    {
      start: ports => {
        startup.push(ports);
        return () => {};
      },
    },
  );
  await rig.act("set");
  for (const value of [...startup, ...seen])
    for (const key of ["keys", "secrets", "resolver", "capabilities"]) expect(value).not.toHaveProperty(key);
  for (const context of seen) await expect(call(context, "import")).rejects.toThrow("E-ADAPTER-DENIED");
  rig.close();
});
it("el arranque publica vínculos por su bus; cerrar revoca sus métodos guardados", async () => {
  let pending: Promise<unknown> | undefined;
  const borrowed: import("../tools/startup-contract.ts").ToolStartup<Shop>[] = [];
  const rig = setup(
    {
      current: toolAct(Type.Object({}), (_, context) => {
        expect(context.credentials.current("signing")?.revision).toBe(context.by === "mind:vault" ? 1 : undefined);
        return { status: "accepted" };
      }),
    },
    {
      start: ports => {
        borrowed.push(ports);
        const stop = ports.bus.on("boot", () => {
          pending = imported(ports).then(refs => ports.bus.emit(ports.credentials.replace("signing", refs, 0)));
        });
        return stop;
      },
    },
  );
  await pending;
  expect(JSON.stringify(rig.facts())).toContain("credential-bound");
  expect(JSON.stringify(rig.facts())).toContain("mind:vault");
  rig.bus().emit(effect("kit-set", { holder: "mind:vault", tool: "vault", acts: ["current"] }, "ana"));
  expect(await borrowed[0]?.act({ act: "current", target: "vault", input: {} })).toStrictEqual({ status: "accepted" });
  expect((await rig.act("current")).status).toBe("accepted");
  rig.close();
  for (const ports of borrowed) await expect(call(ports, "import")).rejects.toThrow("E-ADAPTER-DENIED");
});
