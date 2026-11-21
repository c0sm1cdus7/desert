// Todos los caminos comparten el freno, incluso anidados, esperas y normalización.
import { afterEach, expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
import { toolAct } from "../act-definition.ts";
import { execute, type Execution } from "../execute.ts";
import { rulesTool } from "./rules.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import type { ReviewRequest, ReviewResult } from "../minds/mind-review.ts";
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
it.each(["ana", "beto", "mind:probe"])("frena a %s directamente y por una llamada anidada", async by => {
  const f = fixture();
  expect((await f.save()).status).toBe("accepted");
  for (const act of ["send", "outer"])
    expect((await settle(execute(f.ports, { act, target: "probe", input: { amount: 11 } }, 0, by))).status).toBe(
      "rejected",
    );
  expect(f.run).not.toHaveBeenCalled();
});
it("relee la regla cambiada mientras el acto espera el veredicto, aunque el supervisor lo deje pasar", async () => {
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
it("una regla que frena no llega a pedir permiso al supervisor", async () => {
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
it("comprueba otra vez antes del adaptador después de una espera dentro de la acción", async () => {
  const f = fixture();
  const pending = settle(execute(f.ports, { act: "delayed", target: "probe", input: { amount: 11 } }, 0, "ana"));
  await f.save({ ...rule, action: { tool: "probe", act: "delayed" } });
  f.proceed();
  expect((await pending).status).toBe("rejected");
  expect(f.call).not.toHaveBeenCalled();
});
it("evalúa el valor normalizado que ejecutará el cuerpo y normaliza una sola vez", async () => {
  const normalize = vi.fn(() => ({ amount: 11 }));
  const f = fixture(normalize);
  await f.save();
  expect(
    (await settle(execute(f.ports, { act: "send", target: "probe", input: { amount: 1 } }, 0, "ana"))).status,
  ).toBe("rejected");
  expect(normalize).toHaveBeenCalledOnce();
  expect(f.run).not.toHaveBeenCalled();
});
it("si cambia el esquema instalado, la regla vigente frena hasta corregirse", async () => {
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
