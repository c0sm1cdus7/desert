// What is confirmed, read whole: what the act puts to be confirmed (what it is for, when it asks nothing), and what
// goes under it. The bar already says what is done and to what.
import { describe, expect, it } from "vitest";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Composition } from "../tools/promises.ts";
import { goTo, seated, type, view } from "./promised-keys.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { knowingShown, markingShop } from "../../tests/support/marking-shop.ts";
import { registered, settlingShop } from "../../tests/support/settling-shop.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";

/** Settling, when the act itself says what is put to be confirmed. */
const summing: Composition<Shop> = {
  ...settlingShop,
  registry: settlingShop.registry.map(tool => {
    const settle = tool.acts["settle"];
    return settle
      ? { ...tool, acts: { ...tool.acts, settle: { ...settle, confirms: () => "s1 queda sin deuda" } } }
      : tool;
  }),
};
type Confirmed = Readonly<{ title: string; said: readonly string[]; options: readonly string[] }>;
/** What the screen says and offers once the keys reached where the act on the sale is confirmed. */
async function confirming(program: Composition<Shop>, shown: Shown<Shop>, keys: string): Promise<Confirmed> {
  const read: Confirmed[] = [];
  await staged(program, async ({ house }) => {
    await given(house(), "sales", [registered]);
    const seat = seated(house(), cast.admin, shown);
    goTo(seat, "sales", "sales/s1");
    type(seat.router, keys);
    const { title, body } = seat.router.screen(view);
    seat.router.stop();
    const thread = body.kind === "thread" ? body : undefined;
    const said = (thread?.events ?? []).map(event => event.text.map(span => span.text).join(""));
    read.push({ title, said, options: (thread?.options ?? []).map(option => option.title) });
  });
  const [confirmed] = read;
  if (!confirmed) throw new Error("The stage did not run");
  return confirmed;
}

describe("what is confirmed", () => {
  it("is what the act is for, when it asks nothing, saying that it cannot be undone", async () => {
    const { title, said, options } = await confirming(settlingShop, shopShown, "s");
    expect(title).toBe("Saldar · s1");
    expect(said).toEqual(["Todo lo que la venta debe", "irreversible"]);
    expect(options).toEqual(["volver", "saldar"]);
  });
  it("is what the act puts to be confirmed; under it, what it is for and that it cannot be undone", async () => {
    const { said, options } = await confirming(summing, shopShown, "s");
    expect(said).toEqual(["s1 queda sin deuda", "todo lo que la venta debe · irreversible"]);
    expect(options).toEqual(["volver", "saldar"]);
  });
  it("is what the act puts to be confirmed and nothing under it, when it can be undone", async () => {
    const { said, options } = await confirming(markingShop, knowingShown, "kt");
    expect(said.at(-1)).toBe("Marcar · $ 1500");
    expect(options).toEqual(["marcar", "volver"]);
  });
});
