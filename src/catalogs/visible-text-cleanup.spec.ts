import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { scene } from "./acts.ts";
import { text } from "./fields.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";

it("matches Unicode classes for each scalar value", () => {
  const invisible = /^(?:\p{White_Space}|\p{Cc}|\p{Cf}|\p{Default_Ignorable_Code_Point}|[⠀ㅤᅟᅠﾠ])$/u;
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const value = String.fromCodePoint(cp);
    if (Value.Check(scene, { general: value }) === invisible.test(value)) throw new Error(`U+${cp.toString(16)}`);
  }
});
it("rejects invisible sale names through the house and accepts text around them", () => {
  const rig = shopRig({ grants: { ana: ["sales", "payments"] } });
  rig.attend("ana", "sales");
  for (const sale of ["\u00ad", "\u2063", "\u3164", "\u2800", "\u200b", "\u0085"]) {
    expect(rig.act("ana", "register", { sale, total: 100 }, "sales", rig.state().through).status).toBe("rejected");
    expect(Value.Check(text("Nota", "x"), `a${sale}b`)).toBe(true);
  }
  expect(rig.act("ana", "register", { sale: "a⠀b", total: 100 }, "sales", rig.state().through).status).toBe("accepted");
});
