// What is confirmed when an act asks nothing: what the act is for, under a bar that says what is done and to what.
import { describe, expect, it } from "vitest";
import { goTo, seated, view } from "./promised-keys.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { registered, settlingShop } from "../../tests/support/settling-shop.ts";
import { shopShown } from "../../tests/support/shop.ts";

describe("an act that asks nothing and cannot be undone", () => {
  it("is confirmed by what it is for, saying that it cannot be undone: the bar already says what and to what", () =>
    staged(settlingShop, async ({ house }) => {
      await given(house(), "sales", [registered]);
      const seat = seated(house(), cast.admin, shopShown);
      goTo(seat, "sales", "sales/s1");
      seat.router.send({ kind: "type", text: "s" });
      const { title, body } = seat.router.screen(view);
      const said = body.kind === "thread" ? body.events.map(event => event.text.map(span => span.text).join("")) : [];
      const options = body.kind === "thread" ? (body.options ?? []).map(option => option.title) : [];
      seat.router.stop();
      expect(title).toBe("Saldar · s1");
      expect(said).toEqual(["Todo lo que la venta debe", "irreversible"]);
      expect(options).toEqual(["volver", "saldar"]);
    }));
});
