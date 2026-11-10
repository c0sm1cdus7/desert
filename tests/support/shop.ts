// A product that lives in a house only in tests: a shop that registers sales and receives payments.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { vocabulary, type Emission, type Event, type ProductFacts } from "../../src/journal/events.ts";
const name = Type.String({ minLength: 1 });
const amount = Type.Number({ minimum: 0 });
export const shopCatalog = {
  "sale-registered": object({ sale: name, total: amount }),
  "payment-received": object({ payment: name, amount, sale: Type.Optional(name) }),
};
export type ShopFact = ProductFacts<typeof shopCatalog>;
export type ShopEvent = Event<ShopFact>;
export type ShopEmission = Emission<ShopFact>;
export const shop = vocabulary(shopCatalog);
