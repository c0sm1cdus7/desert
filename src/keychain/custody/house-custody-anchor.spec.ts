import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../../tests/support/adapter-house.ts";
import { imported, call } from "../../../tests/support/declared-adapters.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { effect } from "../../house/facts.ts";
it("two bindings of one action are anchored after the commit; an anchor cut is recovered", async () => {
  const input = Type.Object({});
  const rig = adapterHouse({
    set: toolAct(input, async (_, context) => {
      const refs = await imported(context);
      vi.spyOn(MemoryHouseKeys.prototype, "anchor").mockImplementation(() => {
        throw new Error("cut");
      });
      return {
        status: "accepted",
        effects: [context.credentials.replace("signing", refs, 0), context.credentials.replace("backup", refs, 0)],
      };
    }),
    current: toolAct(input, (_, context) => {
      expect(context.credentials.current("signing")?.refs).toEqual(context.credentials.current("backup")?.refs);
      expect(context.credentials.revision("signing")).toBe(1);
      expect(context.credentials.revision("backup")).toBe(1);
      return { status: "accepted" };
    }),
  });
  await rig.act("set");
  vi.restoreAllMocks();
  rig.restart();
  expect((await rig.act("current")).status).toBe("accepted");
  expect(JSON.stringify(rig.facts()).match(/credential-bound/gu)).toHaveLength(2);
});
it("closing the loan does not mask a signature that already returned its public result", async () => {
  const input = Type.Object({});
  const rig = adapterHouse({
    sign: toolAct(input, async (_, context) => {
      const refs = await imported(context);
      const result = await call(context, "inspect", refs);
      return { status: "accepted", text: JSON.stringify(result) };
    }),
  });
  const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disk");
  });
  try {
    expect((await rig.act("sign")).status).toBe("accepted");
  } finally {
    fail.mockRestore();
  }
  rig.restart();
  expect(JSON.stringify(rig.facts())).toContain("credential-purged");
});
it("the public bus does not allow forging an authenticated batch either", () => {
  const rig = adapterHouse({});
  expect(() =>
    rig
      .bus()
      .emit(
        effect(
          "tool-entry",
          { tool: "vault", target: "vault", author: "ana", text: "", detail: { custodyBatch: [] } },
          "ana",
        ),
      ),
  ).toThrow("E-CUSTODY-DENIED");
});
it("nesting the batch keeps its instant and reads the clock again when it ends", () => {
  const rig = adapterHouse({});
  let ticks = Date.now();
  const time = vi.spyOn(Date, "now").mockImplementation(() => ++ticks);
  const write = () =>
    rig.bus().emit(
      effect(
        "tool-entry",
        {
          tool: "vault",
          target: "vault",
          author: "ana",
          text: "synthetic",
        },
        "ana",
      ),
    );
  try {
    const together = rig.bus().together(() => {
      const first = write(),
        nested = rig.bus().together(write),
        last = write();
      return [first.at, nested.at, last.at];
    });
    expect(new Set(together).size).toBe(1);
    expect(write().at).toBeGreaterThan(together[0] ?? Infinity);
  } finally {
    time.mockRestore();
  }
});
