import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { text } from "./fields.ts";
import { money, shownMoney } from "./money-field.ts";
it("applies the complete visible-text rule to free text", () => {
  const field = text("Nombre", "");
  const invisible = /^(?:\p{White_Space}|\p{Cc}|\p{Cf}|\p{Default_Ignorable_Code_Point}|[⠀ㅤᅟᅠﾠ])$/u;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const value = String.fromCodePoint(cp);
    if (Value.Check(field, value) === invisible.test(value)) throw new Error(`U+${cp.toString(16)}`);
  }
});
it("shows exactly up to the field's maximum", () => {
  const maximum = money("").maximum;
  if (maximum === undefined) throw new Error("missing maximum");
  const locale = { currency: "$", thousands: ".", decimal: "," };
  expect(shownMoney(String(maximum), locale)).toBeTruthy();
  expect(() => shownMoney(String(maximum + 1), locale)).toThrow();
});
