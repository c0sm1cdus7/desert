// Long acts stay visible while they run; completion, failure and a restart never repeat or lose an execution.
import { Type } from "@sinclair/typebox";
import { afterEach, describe, expect, it, vi } from "vitest";
import { identityView } from "../house/members.ts";
import { reading, toolAct } from "./act-definition.ts";
import type { ActResult, Tool, ToolAct } from "./tool-contract.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";

type Result = ActResult<Shop>;
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const tool = (id: string, acts: Readonly<Record<string, ToolAct<Shop>>>, more: Partial<Tool<Shop>> = {}) => ({
  id,
  purpose: "A tool of the test.",
  targets: () => [],
  view: () => "",
  summary: () => "",
  acts,
  ...more,
});
const nothing = Type.Object({});
const open = (added: Tool<Shop>, ports: Parameters<typeof shopRig>[0] = {}) => {
  const rig = shopRig({ registry: [...shopRegistry, added], ...ports });
  rigs.push(rig);
  for (const target of [added.id, "sales"]) rig.attend("ana", target);
  return rig;
};
const slow = (run: () => Result | Promise<Result>) => tool("slow", { run: reading(toolAct(nothing, run)) });
const results = (rig: ReturnType<typeof shopRig>) =>
  rig.facts().flatMap(event => (event.kind === "act-result" ? [event.data] : []));

describe("long acts", () => {
  it("exposes processing while the house goes on, then writes the result and calls for attention", async () => {
    let finish: (result: Result) => void = () => {};
    const run = vi.fn(() => new Promise<Result>(resolve => (finish = resolve)));
    const rig = open(slow(run));
    const started = rig.act("ana", "run", {}, "slow");
    expect(started.status).toBe("processing");
    expect(rig.state().processing.size).toBe(1);
    expect(rig.state().acts.size).toBe(1);
    const [act] = rig.state().acts.keys();
    expect(results(rig).some(result => result.act === act)).toBe(false);
    expect(rig.act("ana", "register", { sale: "s1", total: 1 }, "sales").status).toBe("accepted");
    finish({ status: "accepted", text: "Finished later" });
    expect(started.status === "processing" && (await started.completion).status).toBe("accepted");
    expect(rig.state().processing.size).toBe(0);
    expect(rig.state().acts.size).toBe(0);
    expect(results(rig).at(-1)).toMatchObject({ act, status: "accepted", output: true });
    expect(rig.facts().findLast(event => event.kind === "stimulus")).toMatchObject({
      by: "ana",
      cause: [act],
      data: { tool: "slow" },
    });
    rig.restart();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new Error("the bank refused the transfer"), toolTexts.baseFailure],
    [new Error(""), toolTexts.baseFailure],
  ])("turns an internal base rejection into its public code and records the cause: %s", async (thrown, reason) => {
    const rig = open(slow(() => Promise.reject(thrown)));
    const started = rig.act("ana", "run", {}, "slow");
    expect(started.status === "processing" && (await started.completion)).toMatchObject({ status: "rejected", reason });
    expect(results(rig).at(-1)).toMatchObject({ status: "rejected", reason });
    expect(rig.state().processing.size).toBe(0);
  });

  it("turns a throw into a result, never into a house that stops", () => {
    const rig = open(
      slow(() => {
        throw new Error("no paper");
      }),
    );
    expect(rig.act("ana", "run", {}, "slow")).toMatchObject({ status: "rejected", reason: toolTexts.baseFailure });
    expect(rig.state().processing.size).toBe(0);
  });

  it("closes as interrupted an act the house was running when it stopped, and never runs it again", async () => {
    let finish: (result: Result) => void = () => {};
    const run = vi.fn(() => new Promise<Result>(resolve => (finish = resolve)));
    const rig = open(slow(run));
    const started = rig.act("ana", "run", {}, "slow");
    const [act] = rig.state().acts.keys();
    rig.restart();
    rig.boot();
    expect(results(rig).at(-1)).toEqual({ act, status: "interrupted", reason: toolTexts.interrupted });
    expect(rig.facts().findLast(event => event.kind === "act-result")?.by).toBe("ana");
    finish({ status: "accepted", text: "Too late" });
    expect(started.status === "processing" && (await started.completion).reason).toBe(toolTexts.interrupted);
    rig.restart();
    rig.boot();
    expect(run).toHaveBeenCalledTimes(1);
    expect(results(rig).filter(result => result.status === "interrupted")).toHaveLength(1);
    expect(rig.state().processing.size).toBe(0);
  });
});

describe("what decides an act", () => {
  it("writes nothing for an envelope that is not an act", () => {
    const rig = open(slow(() => ({ status: "accepted" })));
    const before = rig.facts().length;
    expect(rig.tools().act({ target: "slow" }, 0, "ana")).toMatchObject({ reason: toolTexts.invalid });
    expect(rig.facts()).toHaveLength(before);
  });

  it("keeps as a draft an act written against a view that changed, without running it", () => {
    const run = vi.fn((): Result => ({ status: "accepted", text: "Sent" }));
    const stale: Tool<Shop>["draft"] = (state, through) => (state.through > through + 1 ? "notes" : undefined);
    const rig = open(tool("notes", { write: toolAct(nothing, run) }, { draft: stale }));
    expect(rig.act("ana", "write", {}, "notes", 0)).toMatchObject({ status: "draft", reason: toolTexts.draft });
    expect(run).not.toHaveBeenCalled();
    expect(rig.state().entries.at(-1)?.data).toMatchObject({ tool: "notes", draft: true, author: "ana" });
    expect(rig.act("ana", "write", {}, "notes").status).toBe("accepted");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("gives the tool's own cause when an act is not offered now, or when its result does not stand", () => {
    const closed = {
      ...toolAct<Shop, typeof nothing>(nothing, () => ({ status: "accepted" })),
      offered: () => "closed",
    };
    const empty: ToolAct<Shop> = {
      ...toolAct(nothing, () => ({ status: "accepted", text: "" })),
      reject: (_context, result) => (result.text ? undefined : "nothing to say"),
    };
    const rig = open(tool("desk", { open: closed, say: empty }));
    expect(rig.act("ana", "open", {}, "desk")).toMatchObject({ status: "rejected", reason: "closed" });
    expect(rig.act("ana", "say", {}, "desk")).toMatchObject({ status: "rejected", reason: "nothing to say" });
    expect(rig.state().entries.filter(entry => entry.data.tool === "desk")).toEqual([]);
  });

  it("uses offered for a refusal before the body, without a second execution hook", () => {
    const run = vi.fn((): Result => ({ status: "accepted" }));
    const rig = open(tool("slow", { run: { ...toolAct(nothing, run), offered: () => "counting stock" } }));
    expect(rig.act("ana", "run", {}, "slow")).toMatchObject({ status: "rejected", reason: "counting stock" });
    expect(run).not.toHaveBeenCalled();
    expect(rig.act("ana", "register", { sale: "s1", total: 1 }, "sales").status).toBe("accepted");
  });

  it("runs an act inside another as the same identity, and stops an act that would call itself", async () => {
    const sell = { act: "register", target: "sales", input: { sale: "s9", total: 5 } };
    const rig = open(
      tool("desk", {
        sell: toolAct(
          nothing,
          async (_input, context) => (await context.execute?.(sell)) ?? { status: "inconclusive" },
        ),
        loop: toolAct(nothing, async (_input, context) => {
          const again = await context.execute?.({ act: "loop", target: "desk", input: {} });
          return again ?? { status: "inconclusive" };
        }),
      }),
    );
    const sold = rig.act("ana", "sell", {}, "desk");
    expect(sold.status === "processing" && (await sold.completion).status).toBe("accepted");
    expect(rig.state().tools.sales.get("s9")).toEqual({ total: 5, paid: 0, by: "ana" });
    const outer = rig.facts().find(event => event.kind === "act" && event.data.option === "sell");
    const inner = rig.facts().find(event => event.kind === "act" && event.data.option === "register");
    expect(inner).toMatchObject({ by: "ana", cause: [outer?.id] });
    const looped = rig.act("ana", "loop", {}, "desk");
    const stopped = { status: "rejected", reason: toolTexts.unknown };
    expect(looped.status === "processing" && (await looped.completion)).toMatchObject(stopped);
    expect(rig.facts().filter(event => event.kind === "act" && event.data.option === "loop")).toHaveLength(1);
  });

  it("preserves inconclusive and interrupted results from nested acts", async () => {
    const rig = open(
      tool("desk", {
        uncertain: toolAct(nothing, () => ({ status: "inconclusive" })),
        stopped: toolAct(nothing, () => ({ status: "interrupted", reason: "corte" })),
        call: toolAct(
          nothing,
          async (_input, context) =>
            (await context.execute?.({ act: "uncertain", target: "desk", input: {} })) ?? {
              status: "rejected",
              reason: "missing",
            },
        ),
        callStopped: toolAct(
          nothing,
          async (_input, context) =>
            (await context.execute?.({ act: "stopped", target: "desk", input: {} })) ?? {
              status: "rejected",
              reason: "missing",
            },
        ),
      }),
    );
    const uncertain = rig.act("ana", "call", {}, "desk");
    expect(uncertain.status === "processing" && (await uncertain.completion).status).toBe("inconclusive");
    const stopped = rig.act("ana", "callStopped", {}, "desk");
    expect(stopped.status === "processing" && (await stopped.completion)).toMatchObject({
      status: "interrupted",
      reason: "corte",
    });
  });

  it("shows a private receipt only to the actor and never writes it to the journal", () => {
    const whisper = toolAct<Shop, typeof nothing>(nothing, () =>
      Object.assign({ status: "accepted" as const, text: "Resultado", private: "recibo" }, { recipient: "beto" }),
    );
    const everyone = { ana: ["desk", "sales"], beto: ["desk"], carla: ["desk"] };
    const rig = open(tool("desk", { whisper }), { grants: everyone });
    const result = rig.act("ana", "whisper", {}, "desk");
    expect(result).toMatchObject({ private: "recibo" });
    expect(rig.facts().some(event => JSON.stringify(event).includes("recibo"))).toBe(false);
    expect(
      rig
        .facts()
        .filter(event => event.kind === "act-done" || event.kind === "tool-entry")
        .every(event => !Object.hasOwn(event.data, "recipient")),
    ).toBe(true);
    expect(rig.facts().findLast(event => event.kind === "act-done")?.data).toEqual({
      object: "desk",
      act: "whisper",
      text: "Resultado",
    });
    const reads = (by: string) => identityView(rig.state(), by).entries.map(entry => entry.data.text);
    expect(reads("ana")).toEqual(["Resultado"]);
    expect(reads("beto")).toEqual(["Resultado"]);
    expect(reads("carla")).toEqual(["Resultado"]);
  });
});

it("keeps a private receipt out of diagnostics when its public effects cannot be written", () => {
  const receipt = "synthetic-private-receipt";
  const whisper = toolAct<Shop, typeof nothing>(nothing, () => ({
    status: "accepted",
    text: "Public",
    private: receipt,
  }));
  const rig = open(tool("desk", { whisper }));
  const output: unknown[] = [];
  const logged = vi.spyOn(console, "error").mockImplementation((...values: unknown[]) => {
    output.push(values);
  });
  const stop = rig.bus.on(event => {
    if (event.layer === "house" && event.kind === "act-done") {
      stop();
      throw new Error("Synthetic write failure");
    }
  });
  try {
    const result = rig.act("ana", "whisper", {}, "desk");
    expect(result.status).not.toBe("accepted");
    expect(JSON.stringify([result, rig.facts(), output]).includes(receipt)).toBe(false);
  } finally {
    stop();
    logged.mockRestore();
  }
});
