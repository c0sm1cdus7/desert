// Attention fixtures: one honest recipient and one recipient omitted from the promise.
import type { State } from "../../src/tools/tool-contract.ts";
import type { Composition } from "../../src/tools/promises.ts";
import { settlingShop } from "./settling-shop.ts";
import type { Shop } from "./shop.ts";
export function directedShop(promised = true, to = "beto"): Composition<Shop> {
  const registry = settlingShop.registry.map(tool => {
    if (tool.id !== "sales") return tool;
    const acts = Object.fromEntries(
      Object.entries(tool.acts).map(([name, act]) => [
        name,
        {
          ...act,
          cases: act.cases.map(kase => {
            if ("refused" in kase.then || !kase.then.needs || !promised) return kase;
            return { ...kase, then: { ...kase.then, needs: kase.then.needs.map(need => ({ ...need, to })) } };
          }),
        },
      ]),
    );
    return {
      ...tool,
      acts,
      needs: (state: State<Shop>, now: number) => (tool.needs?.(state, now) ?? []).map(need => ({ ...need, to })),
    };
  });
  return { ...settlingShop, registry };
}
