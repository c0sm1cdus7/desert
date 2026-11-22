// Every path shares the stop, including nested acts, waits and normalization.
import { afterEach, expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { toolAct } from "../act-definition.ts";
import { execute, type Execution } from "../execute.ts";
import { rulesTool } from "./rules.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import type { ActVerdict, ReviewRequest, ReviewResult } from "../minds/mind-review.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
import { noCapabilities } from "../execution/execution-capabilities.ts";
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach(close => close()));
const schema = Type.Object({ amount: Type.Number() });
const rule = {
  id: "limit",
  text: "Tope",
  action: { tool: "probe", act: "send" },
  condition: { operator: "gt", field: { source: "input", path: "amount" }, value: 10 },
  effect: "block",
};
function fixture(normalize?: (value: unknown) => unknown) {
  const run = vi.fn(() => ({ status: "accepted" as const }));
  let proceed = () => {};
  const call = vi.fn(() => Promise.resolve({}));
  const registry = [
    ...shopRegistry,
    {
      id: "probe",
      purpose: "Prueba",
      targets: () => [],
      summary: () => "",
      view: () => "",
      acts: {
        send: toolAct<Shop, typeof schema>(schema, run, "world", normalize),
        outer: toolAct<Shop, typeof schema>(schema, async (input, context) => {
          if (!context.execute) throw new Error("missing execute");
          return context.execute({ act: "send", target: "probe", input });
        }),
        delayed: toolAct<Shop, typeof schema>(
          schema,
          async (_, context) => {
            await new Promise<void>(resolve => {
              proceed = resolve;
            });
            await context.ports.test?.send?.({});
            return { status: "accepted" };
          },
          "world",
        ),
      },
    },
  ];
  const all = [...registry, rulesTool(registry)];
  const rig = shopRig({ registry: all });
  cleanup.push(rig.close);
  for (const by of ["ana", "beto"]) for (const target of ["rules", "probe"]) rig.attend(by, target);
  rig.bus.emit(effect("kit-set", { holder: "mind:probe", tool: "probe", acts: ["send", "outer", "delayed"] }, "ana"));
  const ports: Execution<Shop> = {
    bus: rig.bus,
    registry: all,
    state: rig.state,
    now: () => 0,
    own: () => [],
    process: () => false,
    live: () => true,
    secrets: { capture: () => {}, scrub: value => value },
    capabilities: () => ({
      ...noCapabilities,
      ports: { test: { send: call } },
      capture: () => "",
      close: () => {},
      together: work => work(),
      recognizes: () => false,
      apply: () => false,
    }),
  };
  const save = (definition = rule) => settle(rig.act("ana", "save", definition, "rules"));
  return { rig, ports, run, save, call, proceed: () => proceed() };
}
it.each(["ana", "beto", "mind:probe"])("stops %s directly and through a nested call", async by => {
  const f = fixture();
  expect((await f.save()).status).toBe("accepted");
  for (const act of ["send", "outer"])
    expect((await settle(execute(f.ports, { act, target: "probe", input: { amount: 11 } }, 0, by))).status).toBe(
      "rejected",
    );
  expect(f.run).not.toHaveBeenCalled();
});
it("rereads the rule changed while the act awaits the verdict, even if the supervisor lets it pass", async () => {
  const f = fixture();
  expect((await f.save({ ...rule, effect: "require-supervisor" })).status).toBe("accepted");
  let finish: (result: ReviewResult) => void = () => {};
  let request: ReviewRequest | undefined;
  const ports = {
    ...f.ports,
    judge: true,
    review: {
      review: (value: ReviewRequest) => {
        request = value;
        return new Promise<ReviewResult>(resolve => {
          finish = resolve;
        });
      },
    },
  };
  const pending = settle(execute(ports, { act: "send", target: "probe", input: { amount: 11 } }, 0, "mind:probe"));
  expect(request).toBeDefined();
  expect((await f.save()).status).toBe("accepted");
  expect(f.rig.state().house.rules.active.get("limit")).toBe(2);
  if (!request) throw new Error("missing review");
  finish({ proposal: request.id, through: request.through, rulesVersion: "v1", outcome: "passed", text: "Sí" });
  expect((await pending).status).toBe("rejected");
  expect(f.run).not.toHaveBeenCalled();
});
it("a rule that stops never gets to ask the supervisor for permission", async () => {
  const f = fixture();
  await f.save();
  const review = vi.fn((request: ReviewRequest): ReviewResult => ({
    proposal: request.id,
    through: request.through,
    rulesVersion: "v1",
    outcome: "passed",
    text: "Sí",
  }));
  expect(
    (
      await settle(
        execute(
          { ...f.ports, review: { review } },
          { act: "send", target: "probe", input: { amount: 11 } },
          0,
          "mind:probe",
        ),
      )
    ).status,
  ).toBe("rejected");
  expect(review).not.toHaveBeenCalled();
  expect(f.run).not.toHaveBeenCalled();
});
it("checks again before the adapter after a wait inside the action", async () => {
  const f = fixture();
  const pending = settle(execute(f.ports, { act: "delayed", target: "probe", input: { amount: 11 } }, 0, "ana"));
  await f.save({ ...rule, action: { tool: "probe", act: "delayed" } });
  f.proceed();
  expect((await pending).status).toBe("rejected");
  expect(f.call).not.toHaveBeenCalled();
});
it("evaluates the normalized value the body will run and normalizes only once", async () => {
  const normalize = vi.fn(() => ({ amount: 11 }));
  const f = fixture(normalize);
  await f.save();
  expect(
    (await settle(execute(f.ports, { act: "send", target: "probe", input: { amount: 1 } }, 0, "ana"))).status,
  ).toBe("rejected");
  expect(normalize).toHaveBeenCalledOnce();
  expect(f.run).not.toHaveBeenCalled();
});
it("if the installed schema changes, the current rule stops until corrected", async () => {
  const f = fixture();
  await f.save();
  const send = f.ports.registry.find(tool => tool.id === "probe")?.acts.send;
  if (!send) throw new Error("missing action");
  Object.assign(send, { input: Type.Object({ other: Type.Number() }) });
  const result = await settle(execute(f.ports, { act: "send", target: "probe", input: { other: 1 } }, 0, "ana"));
  expect(result).toMatchObject({ status: "rejected", coreFailure: "forbidden" });
  expect(f.rig.facts().findLast(event => event.kind === "rule-evaluated")?.data).toMatchObject({
    results: [{ id: "limit", version: 1, outcome: "block" }],
  });
  expect(f.run).not.toHaveBeenCalled();
});
const marked = { ...rule, effect: "require-supervisor" };
const passing = () =>
  vi.fn<ActVerdict>(request =>
    Promise.resolve({
      proposal: request.id,
      through: request.through,
      rulesVersion: "v1",
      outcome: "passed",
      text: "Sí",
    }),
  );
it("an identity's nested marked act gets the supervisor's verdict, as a direct one does", async () => {
  const f = fixture();
  expect((await f.save(marked)).status).toBe("accepted");
  const verdict = passing();
  const ports = { ...f.ports, supervisor: () => verdict };
  const nested = await settle(execute(ports, { act: "outer", target: "probe", input: { amount: 11 } }, 0, "ana"));
  expect(nested.status).toBe("accepted");
  expect(verdict.mock.calls.map(([request]) => [request.by, request.act.act])).toEqual([["ana", "send"]]);
  expect(f.run).toHaveBeenCalledOnce();
});
it("a marked act with no verdict is not done and says why: no supervisor, one starting, or a reaction", async () => {
  const f = fixture();
  expect((await f.save(marked)).status).toBe("accepted");
  const verdict = passing();
  const send = { act: "send", target: "probe", input: { amount: 11 } };
  const reason = async (ports: Execution<Shop>) => (await settle(execute(ports, send, 0, "ana"))).reason;
  expect(await reason(f.ports)).toBe(rulesTexts.waiting);
  expect(await reason({ ...f.ports, supervisor: () => "starting" })).toBe(rulesTexts.starting);
  // A reaction runs only acts that stay in the house: the rule marks `outer` for everyone.
  const always = { ...marked, id: "outer", action: { tool: "probe", act: "outer" }, condition: { operator: "always" } };
  expect((await settle(f.rig.act("ana", "save", always, "rules"))).status).toBe("accepted");
  const reaction = { id: '["probe","r"]', notice: "n1" };
  const outer = execute(
    { ...f.ports, supervisor: () => verdict },
    { ...send, act: "outer" },
    0,
    "mind:probe",
    [],
    reaction,
  );
  expect((await settle(outer)).reason).toBe(rulesTexts.reaction);
  expect(verdict).not.toHaveBeenCalled();
  expect(f.run).not.toHaveBeenCalled();
});
