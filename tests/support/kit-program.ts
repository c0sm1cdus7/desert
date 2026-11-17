import { object } from "../../src/fields/visible-text.ts";
import { programAct } from "../../src/tools/promises.ts";
import { shopShown, type Shop } from "./shop.ts";
import { shopWith, withIdentities } from "./shop-variants.ts";
const input = object({});
const wait = programAct<Shop, typeof input>({
  name: "esperar",
  enter: "esperar",
  purpose: "espera de prueba",
  key: "e",
  on: "tool",
  undoable: true,
  input,
  run: (_, { signal }) =>
    new Promise(resolve => {
      if (signal?.aborted) resolve({ status: "accepted", text: "Terminada" });
      else signal?.addEventListener("abort", () => resolve({ status: "accepted", text: "Terminada" }), { once: true });
    }),
  cases: [{ promise: "only by its kit", by: "carla", input: {}, then: { refused: "fuera del kit" } }],
});
export const kitProgram = withIdentities(shopWith({ sales: { acts: { wait } } }));
export const kitShown = shopShown;
