// Screen code is a program boundary; a lost screen diagnostic is a base failure with stderr evidence.
import { expect, it, vi } from "vitest";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";
import { houseRouter } from "../../surface/bridge/house-router.ts";
import { anyToolScreen } from "../../surface/bridge/any-tool.ts";
import type { Shown } from "../../surface/bridge/house-ports.ts";
import { localPorts } from "../house-runtime.ts";
import { cast, staged } from "../promised-stage.ts";
import { type, view } from "../promised-keys.ts";

for (const mode of ["run", "lost view"] as const) {
  it(`${mode}: closes the failed screen and preserves its diagnostic`, () =>
    staged(shopProgram, async ({ house }) => {
      const ports = localPorts(house(), cast.admin, { recentLines: 100 });
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      const stop = house().bus.on(event => {
        if (mode === "lost view" && event.kind === "tool-entry") throw new Error("journal listener failure");
      });
      const shown: Shown<Shop> = {
        ...shopShown,
        screens: {
          sales: (...args) => {
            const plain = anyToolScreen(...args);
            const fail = (): never => {
              throw new Error("custom screen stack");
            };
            if (mode === "lost view") return { ...plain, view: fail };
            return {
              ...plain,
              acts: Object.fromEntries(Object.entries(plain.acts).map(([name, act]) => [name, { ...act, run: fail }])),
            };
          },
        },
      };
      const router = houseRouter(ports, shown);
      try {
        type(router, "v");
        if (mode === "run") {
          type(router, "rs9");
          router.send({ kind: "confirm" });
          type(router, "100");
          router.send({ kind: "confirm" });
          await router.idle();
        }
        const screen = JSON.stringify(router.screen(view));
        expect(screen).toContain(mode === "run" ? "E-PROG-1" : "E-BASE-1");
        expect(screen).not.toContain("custom screen stack");
        if (mode === "lost view") {
          expect(JSON.stringify(errors.mock.calls)).toContain("custom screen stack");
          expect(JSON.stringify(errors.mock.calls)).toContain("journal listener failure");
        } else expect(JSON.stringify(house().tools.state().entries)).toContain("custom screen stack");
        router.send({ kind: "cancel" });
        expect(router.screen(view).title).toBe(mode === "run" ? "Ventas" : "Menú");
      } finally {
        router.stop();
        stop();
        errors.mockRestore();
      }
    }));
}
