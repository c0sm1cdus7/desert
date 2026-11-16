import { object } from "../../src/fields/visible-text.ts";
import { programAct } from "../../src/tools/promises.ts";
import { identitiesTool } from "../../src/tools/identities/identities.ts";
import { salesTool, shopProgram, shopShown, type Shop } from "./shop.ts";
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
const sales = { ...salesTool, acts: { ...salesTool.acts, wait } };
export const kitProgram = {
  ...shopProgram,
  identities: true,
  registry: [
    sales,
    ...shopProgram.registry.filter(tool => tool.id !== "sales"),
    identitiesTool([sales, ...shopProgram.registry.filter(tool => tool.id !== "sales")], "house"),
  ],
};
export const kitShown = shopShown;
