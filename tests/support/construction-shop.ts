// One correction can be called with both answers, but its rows ask only one part at a time.
import { correctingShop, partsShown, registered } from "./correcting-shop.ts";
import { anyToolScreen } from "../../src/surface/bridge/views/any-tool.ts";
import { section } from "../../src/surface/bridge/ports/house-ports.ts";
import { actRewritten, shownWith } from "./shop-variants.ts";

export const constructionShop = (accepted = false, lies = false) =>
  actRewritten(correctingShop, "sales", "correct", act => ({
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
  }));
/** An entry from another tool must count even when the case does not name that origin. */
export const foreignOpen = shownWith(
  {
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
  partsShown,
);
