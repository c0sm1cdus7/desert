import { describe, expect, it } from "vitest";
import { contractHouse, documents, sales } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { startTools } from "../../tools/start.ts";
import { effect } from "../../house/facts.ts";
import { projectValue } from "./project-value.ts";
import type { ContractPublicNotice, CoreFailure } from "../../tools/contract-port.ts";
const isNotices = (
  value: readonly ContractPublicNotice[] | CoreFailure | undefined,
): value is readonly ContractPublicNotice[] => Array.isArray(value);
import { Type } from "@sinclair/typebox";

export function readingRig(provider = documents()) {
  const house = contractHouse();
  const runtime = createContractRuntime([sales(), provider], house.ports, house.history);
  const engine = startTools({
    ...house.ports,
    history: house.history.events(house.ports.state().through),
    contracts: runtime.context,
  });
  for (const tool of house.ports.registry) engine.act({ act: "attend", input: { target: tool.id } }, 0, "beto");
  const access = () =>
    runtime.open("sales", {
      tool: "sales",
      by: "beto",
      execute: async act => {
        const result = engine.act(act, house.ports.state().through, "beto");
        return result.status === "processing" ? await result.completion : result;
      },
    });
  const port = access().contracts["fiscal-documents"];
  if (!port) throw new Error("missing fixture contract");
  return {
    ...house,
    runtime,
    port,
    access,
    stop: () => {
      engine.stop();
      house.close();
    },
  };
}
describe("contractual reads", () => {
  it("reads before and after the notice at the core's exact cut, even after later writes and replay", async () => {
    const rig = readingRig();
    try {
      const before = rig.access().cut;
      await rig.port.actions.issue?.({ sale: "v1" });
      const notices = rig.port.notices.issued?.(rig.access().cut);
      if (!isNotices(notices) || !notices[0]) throw new Error("missing notice");
      const notice = notices[0];
      const atNotice = rig.port.objects.voucher?.read("v1", notice.cut);
      expect(atNotice).toMatchObject({
        status: "found",
        sequence: notice.sequence,
        value: { number: "1", state: "issued" },
      });
      expect(atNotice && "value" in atNotice ? atNotice.value : null).not.toHaveProperty("private");
      await rig.port.actions.issue?.({ sale: "v2" });
      expect(rig.port.objects.voucher?.read("v1", before)).toEqual({
        status: "unavailable",
        sequence: before.sequence,
      });
      expect(rig.port.objects.voucher?.read("v1", notice.cut)).toEqual(atNotice);
      expect(rig.port.objects.voucher?.read("v2", notice.cut)).toEqual({
        status: "unavailable",
        sequence: notice.sequence,
      });
      expect(notice.author).toBe("beto");
      expect(notice.causes.length).toBeGreaterThan(0);
      expect(rig.history.at(notice.sequence)?.through).toBe(notice.sequence);
      expect(rig.history.at(rig.ports.state().through + 1)).toBeUndefined();
    } finally {
      rig.stop();
    }
  });
  it("cannot invent cuts, name undeclared dependencies or redirect a historical reference", async () => {
    const rig = readingRig();
    try {
      expect(Object.keys(rig.access().contracts)).toEqual(["fiscal-documents"]);
      expect(rig.access().contracts.notes).toBeUndefined();
      expect(rig.access().contracts.documents).toBeUndefined();
      expect(rig.port.objects.voucher?.read("v1", { sequence: 0 })).toEqual({
        status: "core-failure",
        reason: "invalid-reference",
      });
      await rig.port.actions.issue?.({ sale: "v1" });
      const result = rig.port.objects.voucher?.read("v1", rig.access().cut);
      if (result?.status !== "found") throw new Error("missing receipt");
      expect(rig.port.objects.voucher?.readReference(result.reference, rig.access().cut)).toEqual(result);
      expect(
        rig.port.objects.voucher?.readReference({ ...result.reference, provider: "other" }, rig.access().cut),
      ).toEqual({ status: "core-failure", reason: "invalid-reference" });
      rig.ports.bus.emit(effect("removed", { identity: "beto" }, "ana"));
      expect(rig.port.objects.voucher?.read("v1", rig.access().cut)).toEqual({
        status: "core-failure",
        reason: "forbidden",
      });
      expect(rig.port.notices.issued?.(rig.access().cut)).toEqual({ status: "core-failure", reason: "forbidden" });
    } finally {
      rig.stop();
    }
  });
  it("passes only immutable own state and no executor to a projector", async () => {
    let keys: string[] = [];
    const provider = documents();
    const rig = readingRig({
      ...provider,
      projectors: {
        voucher: own => {
          keys = Object.keys(own);
          const state = own.fiscal;
          if (state instanceof Map) state.clear();
          return { number: "1", state: "issued" };
        },
      },
    });
    try {
      await rig.port.actions.issue?.({ sale: "v1" });
      expect(rig.port.objects.voucher?.read("v1", rig.access().cut)).toEqual({
        status: "core-failure",
        reason: "defect",
      });
      expect(keys).toEqual(["fiscal"]);
      expect(rig.ports.state().tools.documents.fiscal.size).toBe(1);
    } finally {
      rig.stop();
    }
  });
  it("trims nested objects, arrays and the matching union without sharing mutable values", () => {
    const schema = Type.Object({
      items: Type.Array(
        Type.Union([
          Type.Object({ kind: Type.Literal("a"), value: Type.String() }, { additionalProperties: false }),
          Type.Object({ kind: Type.Literal("b"), count: Type.Number() }),
        ]),
      ),
    });
    const source = { items: [{ kind: "a", value: "x", private: "hidden" }], private: "hidden" };
    const value = projectValue(schema, source);
    expect(value).toEqual({ items: [{ kind: "a", value: "x" }] });
    const first = source.items[0];
    if (!first) throw new Error("missing item");
    first.value = "changed";
    expect(value).toEqual({ items: [{ kind: "a", value: "x" }] });
  });
});
