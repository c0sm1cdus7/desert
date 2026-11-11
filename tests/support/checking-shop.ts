// The test shop whose payments are named by a rule: a name that is complete and wrong is said so where it is written.
import { object } from "../../src/catalogs/acts.ts";
import { holding, money, text } from "../../src/catalogs/fields.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { paymentsTool, salesTool, shop, shopProgram, type Shop } from "./shop.ts";

/** A payment is named from p on: the field knows it, and nothing else in the shop checks it. */
const named = holding(text("Pago", "Nombre del pago"), name => (name.startsWith("p") ? undefined : "name"));
const noted = object({ payment: named, amount: money("Monto") });
const noting = (refuses: readonly string[]) =>
  programAct<Shop, typeof noted>({
    name: "anotar",
    enter: "anotar",
    undoable: true,
    purpose: "un pago por su nombre",
    key: "a",
    on: "tool",
    input: noted,
    refuses,
    run: (input, { by }) => ({
      status: "accepted",
      text: `Anotado · ${input.payment}`,
      effects: [shop.fact("payment-received", input, by)],
    }),
    cases: [
      {
        promise: "a payment is noted by its name",
        input: { payment: "p7", amount: 100 },
        then: { says: "Anotado · p7", facts: [{ kind: "payment-received", data: { payment: "p7", amount: 100 } }] },
      },
      {
        promise: "a payment named against the rule is not noted",
        input: { payment: "x7", amount: 100 },
        then: { refused: "name" },
      },
    ],
  });
const shopWith = (refuses: readonly string[]): Composition<Shop> => ({
  ...shopProgram,
  registry: [salesTool, { ...paymentsTool, acts: { ...paymentsTool.acts, note: noting(refuses) } }],
});
export const checkingShop = shopWith(["name"]);
/** The same shop, whose act does not declare the cause its field refuses with. */
export const undeclaredShop = shopWith([]);
export const wrongName = "payments · note · a payment named against the rule is not noted";
