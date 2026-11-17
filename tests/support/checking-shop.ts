// The test shop whose payments are named by a rule: a name that is complete and wrong is said so where it is written.
import { object } from "../../src/fields/visible-text.ts";
import { holding, money, text } from "../../src/fields/fields.ts";
import { programAct } from "../../src/tools/promises.ts";
import { shop, type Shop } from "./shop.ts";
import { shopWith } from "./shop-variants.ts";

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
export const checkingShop = shopWith({ payments: { acts: { note: noting(["name"]) } } });
/** The same shop, whose act does not declare the cause its field refuses with. */
export const undeclaredShop = shopWith({ payments: { acts: { note: noting([]) } } });
export const wrongName = "payments · note · a payment named against the rule is not noted";
