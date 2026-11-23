// Each callback boundary marks its own code; reading state remains a base operation.
import { said } from "../../fields/phrases.ts";
import { object } from "../../fields/visible-text.ts";
import { thing } from "../../fields/fields.ts";
import { expect, it } from "vitest";
import { shopProgram, shopShown } from "../../../tests/support/shop.ts";
import { anyToolScreen } from "../../surface/bridge/views/any-tool.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { type, view } from "./promised-keys.ts";
import { OutsideDefect, programCall, BaseFailure } from "../../fields/program-call.ts";

import type { Tool } from "../../surface/contract/shown-tool.ts";

const fail = (): never => {
  throw new Error("callback diagnostic");
};
const uses: Readonly<Record<string, (tool: Tool) => unknown>> = {
  targets: tool => tool.has?.("sales/s1"),
  view: tool => tool.view("sales/s1"),
  summary: tool => tool.summary(),
  findWords: tool => tool.find?.("s1"),
  needs: tool => tool.notices?.(),
  today: tool => tool.acts.register?.today?.(),
  datum: tool => tool.acts.register?.datum?.(),
  confirms: tool => tool.acts.register?.next(["s2", "100"]),
  among: tool => tool.acts.register?.next([]),
};
for (const [callback, use] of Object.entries(uses)) {
  it(`${callback}: preserves the program diagnostic when the callback throws`, () =>
    staged(shopProgram, async ({ house }) => {
      await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }]);
      const registry = house().registry.map(tool => {
        if (tool.id !== "sales") return tool;
        const register = tool.acts.register;
        if (!register) throw new Error("Missing register");
        const act = { ...register };
        if (callback === "among")
          Reflect.set(act, "input", object({ sale: thing("Venta", "sales", undefined, "register") }));
        const changed = { ...tool, acts: { ...tool.acts, register: act } };
        Reflect.set(["today", "datum", "confirms", "among"].includes(callback) ? act : changed, callback, fail);
        return changed;
      });
      const ports = { ...localPorts(house(), cast.admin, { recentLines: 100 }), registry };
      const tool = houseTools(ports, shopShown, "es").find(tool => tool.id === "sales");
      expect(tool).toBeDefined();
      let reported = "";
      try {
        if (tool) use(tool);
      } catch (error) {
        expect(error).toBeInstanceOf(OutsideDefect);
        expect(error).toMatchObject({ detail: new Error("callback diagnostic") });
        reported = said(ports.defect(error, "sales", "sales", "register"), "es");
      }
      expect(reported).toContain("E-PROG-1");
      expect(JSON.stringify(house().tools.state().entries)).toContain("callback diagnostic");
    }));
}
for (const custom of [false, true])
  it(`base state reader on a ${custom ? "custom" : "built-in"} screen is recorded as base`, () =>
    staged(shopProgram, ({ house }) => {
      const ports = localPorts(house(), cast.admin, { recentLines: 100 });
      let broken = false;
      const router = houseRouter(
        { ...ports, state: () => (broken ? fail() : ports.state()) },
        custom ? { ...shopShown, screens: { sales: anyToolScreen } } : shopShown,
      );
      try {
        type(router, "v");
        broken = true;
        expect(JSON.stringify(router.screen(view))).toContain("E-BASE-1");
        expect(JSON.stringify(house().tools.state().entries)).toContain("callback diagnostic");
      } finally {
        router.stop();
      }
      return Promise.resolve();
    }));
it("a base failure passed through program code retains its origin", () => {
  expect(() =>
    programCall(() => {
      throw new BaseFailure(new Error("base diagnostic"));
    }),
  ).toThrow(BaseFailure);
});
