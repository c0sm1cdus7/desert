import { expect, it } from "vitest";
import { MissingView } from "./navigation/missing-view.ts";
import { goneOf } from "./lists.ts";
import { start, type Session } from "./screen.ts";
import type { Tool } from "./shown-tool.ts";
import { OutsideDefect } from "../tools/outside.ts";

const session: Session = [...start, { kind: "view", tool: "shop", target: "sale", at: 0 }];
const tool: Tool = {
  id: "shop",
  name: "Tienda",
  place: { key: "t", section: "tools" },
  summary: () => "ventas",
  acts: {},
  has: () => true,
  view: () => {
    throw new OutsideDefect(new Error("broken reading"));
  },
};
it("does not turn a broken reading into a removed thing", () => {
  expect(() => goneOf(session, [tool])).toThrow("broken reading");
});
it("recognizes only an explicit absence as gone", () => {
  expect(
    goneOf(session, [
      {
        ...tool,
        view: () => {
          throw new MissingView("shop", "sale");
        },
      },
    ]),
  ).toBe(true);
});
