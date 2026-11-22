import { expect, it } from "vitest";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { paymentsTool, salesTool, shop } from "../../tests/support/shop.ts";

it("reads two sales and a payment from stored cents after replay", () => {
  const rig = shopRig();
  try {
    rig.bus.emit(shop.fact("sale-registered", { sale: "first", total: 1500 }, "ana"));
    rig.bus.emit(shop.fact("sale-registered", { sale: "other", total: 1 }, "ana"));
    rig.bus.emit(shop.fact("payment-received", { payment: "p", sale: "first", amount: 501 }, "ana"));
    rig.restart();
    const state = rig.state();
    expect(state.tools.sales.get("first")).toMatchObject({ total: 1500, paid: 501 });
    expect(state.tools.payments.received).toBe(501);
    const limits = { recentLines: 40, now: 1 };
    expect(salesTool.view(state, "sales", limits)).toContain('"detail":"$ 15,00"');
    expect(salesTool.view(state, "sales", limits)).toContain('"detail":"$ 0,01"');
    expect(salesTool.view(state, "sales/first", limits)).toContain('"paid":"$ 5,01"');
    expect(paymentsTool.view(state, "payments", limits)).toContain('"received":"$ 5,01"');
  } finally {
    rig.close();
  }
});
