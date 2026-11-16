import { Type } from "@sinclair/typebox";
import { effect } from "../../src/journal/events.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { ActContext, ActResult, Reach, Tool } from "../../src/tools/tool-contract.ts";
import type { ExecutionResult } from "../../src/tools/execute.ts";
import { shopRig } from "./shop-rig.ts";
import { shopRegistry, type Shop } from "./shop.ts";

export const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(done => (resolve = done));
  return { promise, resolve };
};
export const settled = (result: ExecutionResult<Shop>) =>
  result.status === "processing" ? result.completion : Promise.resolve(result);
export function runningRig(reach: Reach = "house") {
  const calls: { context: ActContext<Shop>; done: ReturnType<typeof deferred<ActResult<Shop>>> }[] = [];
  const outside: string[] = [];
  const run = toolAct<Shop, ReturnType<typeof Type.Object>>(
    Type.Object({}),
    (_, context) => {
      const done = deferred<ActResult<Shop>>();
      calls.push({ context, done });
      if (reach === "world") outside.push("hecho afuera");
      return done.promise;
    },
    reach,
  );
  const tool: Tool<Shop> = {
    id: "slow",
    facts: ["slow-written"],
    purpose: "Prueba de corte",
    targets: () => [],
    view: () => "Lectura abierta",
    summary: () => "",
    acts: { run, other: run },
  };
  const rig = shopRig({ registry: [...shopRegistry, tool] });
  rig.attend("beto", "slow");
  const kit = (by: string, acts: readonly string[] | null = []) =>
    rig.bus.emit(effect("kit-set", { holder: by, tool: "slow", acts: acts === null ? null : [...acts] }, "ana"));
  kit("mind:slow", null);
  const start = (by = "beto", option = "run") => rig.act(by, option, {}, "slow");
  return { ...rig, calls, kit, start, outside };
}
export const saved = { status: "accepted", text: "Resultado tardío" } as const;
