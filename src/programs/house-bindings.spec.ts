import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported } from "../../tests/support/declared-adapters.ts";
import { toolAct } from "../tools/act-definition.ts";
import { effect } from "../journal/events.ts";
import type { SecretRefs } from "../tools/capabilities-contract.ts";
const input = Type.Object({});
it("rechazar descarta el efecto y conserva la credencial anterior", async () => {
  let refused = false;
  const refs: SecretRefs[] = [];
  const rig = adapterHouse({
    set: toolAct(input, async (_, context) => {
      const next = await imported(context);
      refs.push(next);
      const effects = [context.credentials.replace("signing", next, context.credentials.revision("signing"))];
      return refused ? { status: "rejected", reason: "No", effects } : { status: "accepted", effects };
    }),
    current: toolAct(input, (_, context) => {
      expect(context.credentials.current("signing")?.refs).toEqual(refs[0]);
      return { status: "accepted" };
    }),
  });
  expect((await rig.act("set")).status).toBe("accepted");
  refused = true;
  expect((await rig.act("set")).status).toBe("rejected");
  rig.restart();
  expect((await rig.act("current")).status).toBe("accepted");
  expect(JSON.stringify(rig.facts()).match(/credential-bound/gu)).toHaveLength(1);
});
it("si falla el lote después del vínculo no reemplaza ni borra la versión anterior", async () => {
  const refs: SecretRefs[] = [];
  const rig = adapterHouse({
    set: toolAct(input, async (_, context) => {
      const next = await imported(context);
      refs.push(next);
      return {
        status: "accepted",
        text: "Guardado",
        effects: [context.credentials.replace("signing", next, context.credentials.revision("signing"))],
      };
    }),
    current: toolAct(input, (_, context) => {
      expect(context.credentials.current("signing")?.refs).toEqual(refs[0]);
      return { status: "accepted" };
    }),
  });
  expect((await rig.act("set")).status).toBe("accepted");
  const append = rig.journal().append.bind(rig.journal());
  let hit = false;
  const mock = vi.spyOn(rig.journal(), "append").mockImplementation((emission, at) => {
    if (emission.kind === "act-done" && !hit) {
      hit = true;
      throw new Error("Corte inventado del lote");
    }
    return append(emission, at);
  });
  try {
    expect((await rig.act("set")).status).not.toBe("accepted");
  } finally {
    mock.mockRestore();
  }
  expect(hit).toBe(true);
  rig.restart();
  expect((await rig.act("current")).status).toBe("accepted");
  expect(JSON.stringify(rig.facts()).match(/credential-bound/gu)).toHaveLength(1);
});
it("dos acciones con la misma revisión no pisan una a la otra", async () => {
  const releases: (() => void)[] = [];
  const rig = adapterHouse({
    set: toolAct(input, async (_, context) => {
      const refs = await imported(context);
      await new Promise<void>(resolve => releases.push(resolve));
      return { status: "accepted", effects: [context.credentials.replace("signing", refs, 0)] };
    }),
  });
  const first = rig.act("set"),
    second = rig.act("set");
  await vi.waitFor(() => expect(releases).toHaveLength(2));
  releases.forEach(release => release());
  const results = await Promise.all([first, second]);
  expect(results.filter(result => result.status === "accepted")).toHaveLength(1);
  rig.restart();
  expect(JSON.stringify(rig.facts()).match(/credential-bound/gu)).toHaveLength(1);
});
it("copiar un efecto o escribir un hecho de custodia por el bus no concede autoridad", async () => {
  const rig = adapterHouse({
    set: toolAct(input, async (_, context) => {
      const refs = await imported(context);
      const command = context.credentials.replace("signing", refs, 0);
      return { status: "accepted", effects: [structuredClone(command)] };
    }),
    current: toolAct(input, (_, context) => {
      expect(context.credentials.current("signing")).toBeUndefined();
      return { status: "accepted" };
    }),
  });
  const copied = await rig.act("set");
  expect(copied).toMatchObject({ status: "rejected", effects: [] });
  expect(copied.reason).toContain("tool-entry");
  expect((await rig.act("current")).status).toBe("accepted");
  expect(() =>
    rig
      .bus()
      .emit(
        effect(
          "tool-entry",
          { tool: "vault", target: "vault", author: "ana", text: "", detail: { custodyFact: {} } },
          "ana",
        ),
      ),
  ).toThrow("E-CUSTODY-DENIED");
  rig.restart();
  expect((await rig.act("current")).status).toBe("accepted");
});
it("cerrar durante una operación revoca su continuación sin dejar un vínculo", async () => {
  let finish = () => {};
  const rig = adapterHouse({
    set: toolAct(input, async (_, context) => {
      const refs = await imported(context);
      await new Promise<void>(resolve => {
        finish = resolve;
      });
      return { status: "accepted", effects: [context.credentials.replace("signing", refs, 0)] };
    }),
  });
  const pending = rig.act("set");
  await new Promise(resolve => setImmediate(resolve));
  rig.close();
  finish();
  expect((await pending).status).toBe("rejected");
  rig.restart();
  expect(JSON.stringify(rig.facts())).not.toContain("credential-bound");
});
