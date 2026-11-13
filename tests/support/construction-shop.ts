// One correction can be called with both answers, but its rows ask only one part at a time.
import { correctingShop, partsShown, registered } from "./correcting-shop.ts";
import { anyToolScreen } from "../../src/surface/bridge/any-tool.ts";
import { section, type Shown } from "../../src/surface/bridge/house-ports.ts";
import type { Shop } from "./shop.ts";

export const constructionShop = (accepted = false, lies = false) => ({
  ...correctingShop,
  registry: correctingShop.registry.map(tool => ({
    ...tool,
    acts: Object.fromEntries(
      Object.entries(tool.acts).map(([name, act]) => [
        name,
        name !== "correct"
          ? act
          : {
              ...act,
              cases: [
                ...act.cases,
                {
                  promise: "both answers differ",
                  given: [registered],
                  on: "sales/s1",
                  input: { total: 2000, paid: accepted || lies ? 500 : 3000 },
                  then: accepted ? { says: "Corregida · s1", facts: [] } : { refused: "overpaid" },
                },
              ],
            },
      ]),
    ),
  })),
});
/** An entry from another tool must count even when the case does not name that origin. */
export const foreignOpen: Shown<Shop> = {
  ...partsShown,
  screens: {
    ...partsShown.screens,
    payments: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        view: target => [
          ...plain.view(target),
          section("Otra entrada", [
            {
              title: "corrección abierta",
              key: "z",
              act: "correct",
              on: { tool: "sales", target: "sales/s1" },
            },
          ]),
        ],
      };
    },
  },
};
