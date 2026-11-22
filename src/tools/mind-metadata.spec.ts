import { expect, expectTypeOf, it } from "vitest";
import { Type } from "@sinclair/typebox";
import type { Skill } from "../fields/messages.ts";
import { capabilities, type Capability } from "../fields/capabilities.ts";
import { toolAct, ownAct, reading } from "./act-definition.ts";
import { programAct } from "./promises.ts";
import type { Tool, ToolAct } from "./tool-contract.ts";
import { identitiesTool } from "./identities/identities.ts";
import { identitySkill } from "../texts/tool-skills.texts.ts";
import { registerCases, registerOffer, shopCatalog, salesTool, type Shop } from "../../tests/support/shop.ts";

it("keeps purpose and an optional skill message, rendered only on request", () => {
  expectTypeOf<{ id: string; kind: "skill"; text: Skill["text"] }>().not.toExtend<Skill>();
  const ordinary: Tool<Shop> = salesTool;
  expect(ordinary.purpose).toBeTruthy();
  expect(ordinary.skill).toBeUndefined();
  const tool = identitiesTool<Shop>([], "test");
  expect(tool.skill).toBe(identitySkill);
  expect(tool.purpose).toBeTruthy();
  expect(tool.skill?.text("es", {})).toContain("Nunca");
  expectTypeOf<NonNullable<Tool<Shop>["skill"]>["kind"]>().toEqualTypeOf<"skill">();
});
it("declares only seeing and hearing; absence means writing alone", () => {
  expect(capabilities).toEqual(["sees", "hears"]);
  expectTypeOf<Capability>().toEqualTypeOf<"sees" | "hears">();
  expectTypeOf<ToolAct<Shop>["needs"]>().toEqualTypeOf<readonly Capability[] | undefined>();
  expect(toolAct(Type.Object({}), () => ({ status: "accepted" })).needs).toBeUndefined();
});
it.each([[], ["sees"], ["hears"], ["sees", "hears"]] satisfies Capability[][])(
  "preserves capability requirements through low-level, own and reading acts: %j",
  (...needs) => {
    const input = Type.Object({});
    const act = toolAct(
      input,
      () => ({ status: "accepted" }),
      "house",
      value => value,
      needs,
    );
    expect(act.needs).toEqual(needs);
    expect(reading(act).needs).toEqual(needs);
    expect(ownAct("notes", "add", { input, purpose: "note", needs }, () => ({ status: "accepted" })).needs).toEqual(
      needs,
    );
  },
);
it("preserves requirements in program declarations as well as absent requirements", () => {
  const input = shopCatalog["sale-registered"];
  const declared = {
    ...registerOffer,
    input,
    cases: registerCases,
    run: () => ({ status: "accepted" as const }),
  };
  expect(programAct<Shop, typeof input>({ ...declared, needs: ["sees", "hears"] }).needs).toEqual(["sees", "hears"]);
  expect(programAct<Shop, typeof input>(declared).needs).toBeUndefined();
});
