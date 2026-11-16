import { chargingShop } from "./charging-shop.ts";
/** A calculated opening outside the field, with no case entering from a sale. */
export const invalidOpeningShop = () => ({
  ...chargingShop,
  registry: chargingShop.registry.map(tool => {
    if (tool.id !== "payments") return tool;
    const charge = tool.acts.charge;
    if (!charge?.also) throw new Error("missing charge");
    return {
      ...tool,
      acts: {
        ...tool.acts,
        charge: {
          ...charge,
          cases: charge.cases.filter(kase => kase.from === undefined),
          also: { ...charge.also, opens: () => ({ amount: -5 }) },
        },
      },
    };
  }),
});
