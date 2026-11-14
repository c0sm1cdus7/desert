import { expect, it, vi } from "vitest";
import { object } from "../catalogs/acts.ts";
import { effect } from "../journal/events.ts";
import { toolAct } from "../tools/act-definition.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { call } from "../../tests/support/declared-adapters.ts";
const adapter = () => {
  const open = vi.fn(() => ({ ping: () => ({}) }));
  return {
    open,
    declared: {
      signer: {
        open,
        methods: {
          ping: {
            input: object({}),
            output: object({}),
            permissions: { tools: ["vault", "sales"], slots: [], capture: false },
          },
        },
      },
    },
  };
};
for (const who of ["identity", "mind"])
  it(`holds is checked through execution after ${who} loses its tool`, async () => {
    const { open, declared } = adapter();
    let revoke = () => {};
    const mind = zeroMind("vault", {
      write: toolAct(object({}), async (_, ctx) => {
        revoke();
        await call(ctx, "ping");
        return { status: "accepted" };
      }),
    });
    const rig = adapterHouse(mind.tool.acts, mind.tool, declared);
    rig.bus().emit(effect("kit-set", { holder: "mind:vault", tool: "vault", acts: ["write"] }, "ana"));
    revoke = () => {
      if (who === "identity") rig.bus().emit(effect("granted", { identity: "ana", tools: ["sales"] }, "ana"));
      else rig.options.registry.pop();
    };
    const result = who === "mind" ? await mind.act() : await rig.act("write");
    expect(result.status).toBe("rejected");
    expect(open).not.toHaveBeenCalled();
  });
it("a mind cannot borrow another tool's adapters when targets differ between the house and actor views", async () => {
  const { open, declared } = adapter();
  const mind = zeroMind("vault", {
    write: toolAct(object({}), async (_, ctx) => {
      await call(ctx, "ping");
      return { status: "accepted" };
    }),
  });
  const rig = adapterHouse(mind.tool.acts, { ...mind.tool, targets: () => ["shared"] }, declared);
  const sales = rig.options.registry[0];
  if (!sales) throw new Error("fixture");
  rig.options.registry[0] = { ...sales, targets: state => (state.by === "ana" ? ["shared"] : []) };
  rig.bus().emit(effect("kit-set", { holder: "mind:vault", tool: "vault", acts: ["write"] }, "ana"));
  expect((await mind.act("write", {}, "shared")).status).toBe("rejected");
  expect(open).not.toHaveBeenCalled();
});
