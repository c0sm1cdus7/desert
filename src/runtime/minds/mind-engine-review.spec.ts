// An act a rule marks waits for the supervisor's verdict inside the engine, directly or nested; nothing else waits.
import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { effect } from "../../house/facts.ts";
import { execute, type Execution } from "../../tools/execute.ts";
import { watchRunning } from "../../tools/execution/running-acts.ts";
import { toolAct } from "../../tools/act-definition.ts";
import type { ReviewPort, ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
const result = (request: ReviewRequest, outcome: ReviewResult["outcome"]): ReviewResult => ({
  proposal: request.id,
  through: request.through,
  rulesVersion: "v1",
  outcome,
  text: "Revisión de prueba",
});
function fixture(review?: ReviewPort, marked = true) {
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const registry = [
    ...shopRegistry,
    {
      id: "probe",
      purpose: "Prueba",
      targets: () => [],
      view: () => "",
      summary: () => "",
      acts: {
        send: { ...toolAct<Shop, ReturnType<typeof Type.Object>>(Type.Object({}), run), reach: "world" as const },
        outer: toolAct<Shop, ReturnType<typeof Type.Object>>(Type.Object({}), async (_input, ctx) => {
          if (!ctx.execute) throw new Error("execute");
          return ctx.execute({ act: "send", target: "probe", input: {} });
        }),
      },
    },
  ];
  const rig = shopRig({ registry });
  const grant = (acts: string[]) =>
    rig.bus.emit(effect("kit-set", { holder: "mind:probe", tool: "probe", acts }, "ana"));
  grant(["send", "outer"]);
  const definition = {
    id: "marked",
    text: "Lo que manda una mente afuera requiere supervisión",
    action: { tool: "probe", act: "send" },
    condition: { operator: "always" as const },
    effect: "require-supervisor" as const,
  };
  if (marked) rig.bus.emit(effect("rule-versioned", { definition, previous: null, version: 1 }, "ana"));
  const ports: Execution<Shop> = {
    bus: rig.bus,
    registry,
    state: rig.state,
    own: () => [],
    now: () => 1,
    process: () => false,
    live: () => true,
    secrets: { capture: () => {}, scrub: value => value },
    ...(review ? { review, judge: true } : {}),
    running: new Map(),
  };
  const off = rig.bus.on(watchRunning(ports));
  return {
    rig,
    run,
    ports,
    grant,
    close: () => {
      off();
      rig.close();
    },
  };
}
async function act(ports: Execution<Shop>, nested: boolean) {
  const started = execute(ports, { act: nested ? "outer" : "send", target: "probe", input: {} }, 0, "mind:probe");
  return started.status === "processing" ? started.completion : started;
}
it.each([false, true])("the supervisor rejects a marked act, nested=%s", async nested => {
  const review = vi.fn<ReviewPort["review"]>(request => result(request, "rejected"));
  const f = fixture({ review });
  try {
    expect(await act(f.ports, nested)).toMatchObject({
      status: "rejected",
      reason: {
        en: "Rejected by the supervisor: Revisión de prueba",
        es: "Rechazado por el supervisor: Revisión de prueba",
      },
    });
    expect(review).toHaveBeenCalledOnce();
    expect(f.run).not.toHaveBeenCalled();
    expect(review.mock.calls[0]?.[0].scope).toEqual({ kind: "consciousness", actor: "mind:probe" });
  } finally {
    f.close();
  }
});
it.each([false, true])("a marked act the supervisor lets through is applied: nested=%s", async nested => {
  const f = fixture({ review: (request: ReviewRequest) => result(request, "passed") });
  try {
    expect((await act(f.ports, nested)).status).toBe("accepted");
    expect(f.run).toHaveBeenCalledOnce();
  } finally {
    f.close();
  }
});
it.each([false, true])("an act leaving the house without a rule waits for nobody: nested=%s", async nested => {
  const review = vi.fn<ReviewPort["review"]>(request => result(request, "rejected"));
  const f = fixture({ review }, false);
  try {
    expect((await act(f.ports, nested)).status).toBe("accepted");
    expect(review).not.toHaveBeenCalled();
    expect(f.run).toHaveBeenCalledOnce();
  } finally {
    f.close();
  }
});
it("without a supervisor, the marked act is not done, it says so and notifies whoever has the tool", async () => {
  const f = fixture();
  try {
    expect(await act(f.ports, false)).toMatchObject({ status: "rejected", reason: rulesTexts.waiting });
    expect(f.run).not.toHaveBeenCalled();
    const notice = f.rig.facts().findLast(event => event.kind === "tool-entry");
    expect(notice).toMatchObject({ data: { tool: "probe", text: rulesTexts.waiting, attention: true } });
  } finally {
    f.close();
  }
});
it("a verdict that never arrives leaves the act undone and says why", async () => {
  const f = fixture({ review: request => ({ ...result(request, "failed"), text: "Falta la llave del proveedor." }) });
  try {
    const done = await act(f.ports, false);
    expect(done).toMatchObject({ status: "rejected" });
    expect("reason" in done && done.reason).toEqual(rulesTexts.verdict("failed", "Falta la llave del proveedor."));
    expect(f.run).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it.each([false, true])("revoking while it waits prevents the output, even if granted again: %s", async regrant => {
  let decide: (value: ReviewResult) => void = () => {};
  let request: ReviewRequest | undefined;
  const f = fixture({
    review: value => {
      request = value;
      return new Promise(resolve => {
        decide = resolve;
      });
    },
  });
  try {
    const pending = act(f.ports, true);
    expect(request).toBeDefined();
    f.grant([]);
    if (regrant) f.grant(["send", "outer"]);
    if (!request) throw new Error("review");
    decide(result(request, "passed"));
    expect((await pending).status).not.toBe("accepted");
    expect(f.run).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it("rereads permissions even without a cancellation observer", async () => {
  let decide: (value: ReviewResult) => void = () => {};
  let request: ReviewRequest | undefined;
  const f = fixture({
    review: value => {
      request = value;
      return new Promise(resolve => {
        decide = resolve;
      });
    },
  });
  try {
    const { running: _running, ...ports } = f.ports;
    const pending = act(ports, false);
    f.grant([]);
    if (!request) throw new Error("review");
    decide(result(request, "passed"));
    expect((await pending).status).toBe("interrupted");
    expect(f.run).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it.each(["proposal", "through", "throw"])("approves no foreign or broken review: %s", async fault => {
  const f = fixture({
    review: request => {
      if (fault === "throw") throw new Error("supervisor");
      return { ...result(request, "passed"), ...(fault === "proposal" ? { proposal: "another" } : { through: -1 }) };
    },
  });
  try {
    expect((await act(f.ports, false)).status).toBe("rejected");
    expect(f.run).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
