import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported } from "../../tests/support/declared-adapters.ts";
import type { ToolStartup } from "./startup-contract.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { toolAct } from "./act-definition.ts";
const empty = Type.Object({});
for (const together of [false, true])
  it(`startup reverts the link if a listener fails writing the batch: together=${together}`, async () => {
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
it("a pending anchor notice also reaches whoever ran a nested action", async () => {
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
it("the view is fixed at the start even if its first query arrives after another action", async () => {
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

it("the action reverts its facts if the custody batch fails", async () => {
  const rig = adapterHouse({
    bind: toolAct(empty, async (_, context) => ({
      status: "accepted",
      effects: [context.credentials.replace("signing", await imported(context), 0)],
    })),
  });
  const stop = rig.bus().on("tool-entry", event => {
    const detail = event.data.detail;
    if (detail && typeof detail === "object" && "custodyBatch" in detail) throw new Error("oyente roto");
  });
  await rig.act("bind");
  expect(JSON.stringify(rig.facts())).not.toContain("credential-bound");
  stop();
  expect((await rig.act("bind")).status).toBe("accepted");
  rig.restart();
});
it("an action's anchor is written after the journal's commit", async () => {
  const rig = adapterHouse({
    bind: toolAct(empty, async (_, context) => ({
      status: "accepted",
      effects: [context.credentials.replace("signing", await imported(context), 0)],
    })),
  });
  const journal = rig.journal(),
    batch = journal.batch.bind(journal),
    anchor = rig.options.secretKeys.anchor.bind(rig.options.secretKeys);
  let batching = 0;
  const during: boolean[] = [];
  vi.spyOn(journal, "batch").mockImplementation(work => {
    batching++;
    try {
      return batch(work);
    } finally {
      batching--;
    }
  });
  vi.spyOn(rig.options.secretKeys, "anchor").mockImplementation((house, head) => {
    if (head.count) during.push(batching > 0);
    anchor(house, head);
  });
  try {
    expect((await rig.act("bind")).status).toBe("accepted");
    expect(during.length).toBeGreaterThan(0);
    expect(during).not.toContain(true);
  } finally {
    vi.restoreAllMocks();
  }
});
