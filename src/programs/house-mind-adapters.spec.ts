import { afterEach, expect, it, vi } from "vitest";
import * as house from "../house/house.ts";
import { object } from "../catalogs/acts.ts";
import { effect } from "../journal/events.ts";
import { toolAct } from "../tools/act-definition.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported, call, signer } from "../../tests/support/declared-adapters.ts";
afterEach(() => vi.restoreAllMocks());
it("a denied mind never calls its adapter; an allowed mind binds and uses its own credential", async () => {
  const open = vi.fn(signer.open);
  const holds = vi.spyOn(house, "holds");
  const actors: string[] = [];
  const mind = zeroMind("vault", {
    write: toolAct(object({}), async (_, context) => {
      actors.push(context.by);
      const refs = await imported(context);
      return { status: "accepted", effects: [context.credentials.replace("signing", refs, 0)] };
    }),
    use: toolAct(object({}), async (_, context) => {
      const current = context.credentials.current("signing");
      expect(current).toBeDefined();
      expect(await call(context, "inspect", current?.refs)).toEqual({ valid: true });
      return { status: "accepted" };
    }),
    empty: toolAct(object({}), (_, context) => {
      expect(context.credentials.current("signing")).toBeUndefined();
      return { status: "accepted" };
    }),
  });
  const rig = adapterHouse(mind.tool.acts, mind.tool, { signer: { ...signer, open } });
  const kit = (acts: string[]) =>
    rig.bus().emit(effect("kit-set", { holder: "mind:vault", tool: "vault", acts }, "ana"));
  expect(await mind.act()).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  expect(open).not.toHaveBeenCalled();
  expect(holds).not.toHaveBeenCalled();
  kit(["write", "use"]);
  expect(await mind.act()).toMatchObject({ status: "accepted" });
  expect(await mind.act("use")).toMatchObject({ status: "accepted" });
  expect(actors).toEqual(["mind:vault"]);
  expect(holds).toHaveBeenCalled();
  expect(holds.mock.calls.every(([, , actor, tool]) => actor === "mind:vault" && tool === "vault")).toBe(true);
  expect(open).toHaveBeenCalledTimes(2);
  expect(await rig.act("empty")).toMatchObject({ status: "accepted" });
  rig.restart();
  expect(await mind.act("use")).toMatchObject({ status: "accepted" });
  kit([]);
  open.mockClear();
  holds.mockClear();
  expect(await mind.act("use")).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  expect(open).not.toHaveBeenCalled();
  expect(holds).not.toHaveBeenCalled();
});
