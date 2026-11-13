// The three kinds of failure have distinct public results, diagnostics and an Escape back to the same tool.
import { expect, it, vi } from "vitest";
import { shopProgram, shopShown, paymentsTool, salesTool } from "../../../tests/support/shop.ts";
import { localPorts } from "../house-runtime.ts";
import { cast, staged } from "../promised-stage.ts";
import { type, view } from "../promised-keys.ts";
import { houseRouter } from "../../surface/bridge/house-router.ts";
import { PortFailure } from "../../tools/failures/port-failure.ts";
import { toolTexts } from "../../texts/tools.texts.ts";

const register = salesTool.acts.register;
if (!register) throw new Error("Missing register");
const brokenAct = { ...register };
Reflect.set(brokenAct, "run", () => {
  throw new Error("internal stack");
});
const broken = { ...shopProgram, registry: [paymentsTool, { ...salesTool, acts: { register: brokenAct } }] };
const folded = {
  ...shopProgram,
  slices: {
    ...shopProgram.slices,
    step: {
      ...shopProgram.slices.step,
      sales: (...args: Parameters<typeof shopProgram.slices.step.sales>) => {
        if (args[1].kind === "sale-registered") throw new Error("fold stack");
        return shopProgram.slices.step.sales(...args);
      },
    },
  },
};
const tested = (mode: string) => {
  if (mode === "lost fold") return folded;
  return mode === "program" || mode === "lost" ? broken : shopProgram;
};
const publicReason = (mode: string) => {
  if (mode === "program") return "E-PROG-1";
  if (mode === "port") return "servicio sin respuesta";
  return mode === "raw port" ? toolTexts.disconnected : "E-BASE-1";
};
for (const mode of [
  "program",
  "journal",
  "listener",
  "lost",
  "lost fold",
  "port",
  "raw port",
  "initial",
  "started",
  "result",
] as const) {
  it(`${mode}: shows its public cause, keeps diagnostics and escapes without repeating`, () =>
    staged(tested(mode), async ({ house }) => {
      const ports = localPorts(house(), cast.admin, { recentLines: 100 });
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      const append = house().journal.append.bind(house().journal);
      const write = vi.spyOn(house().journal, "append").mockImplementation((...args) => {
        if (
          (mode === "journal" && args[0].kind === "sale-registered") ||
          ((mode === "lost" || mode === "lost fold") && args[0].kind === "tool-entry") ||
          (mode === "initial" && args[0].kind === "act") ||
          (mode === "started" && args[0].kind === "act-started") ||
          (mode === "result" && args[0].kind === "act-result")
        )
          throw new Error("disk unavailable");
        return append(...args);
      });
      const stop = house().bus.on(event => {
        if (mode === "listener" && event.kind === "sale-registered") throw new Error("listener stack");
      });
      const act: typeof ports.act = (...args) => {
        if (mode === "port") throw new PortFailure("servicio sin respuesta");
        if (mode === "raw port") throw new Error("ECONNRESET at internal host");
        return ports.act(...args);
      };
      const router = houseRouter({ ...ports, act }, shopShown);
      try {
        type(router, "v");
        const before = router.screen(view).title;
        type(router, "rs9");
        router.send({ kind: "confirm" });
        type(router, "100");
        router.send({ kind: "confirm" });
        await router.idle();
        const screen = JSON.stringify(router.screen(view));
        expect(screen).toContain(publicReason(mode));
        expect(screen).toContain("Error");
        expect(screen).not.toMatch(/internal stack|disk unavailable|listener stack|ECONNRESET/);
        if (mode !== "program") expect(screen).not.toContain("E-PROG-1");
        const record = JSON.stringify(house().tools.state().entries);
        if (mode === "program") expect(record).toContain("internal stack");
        if (mode === "journal") expect(record).toContain("disk unavailable");
        if (mode === "listener") expect(record).toContain("listener stack");
        if (mode === "lost" || mode === "lost fold") {
          expect(errors).toHaveBeenCalled();
          expect(JSON.stringify(errors.mock.calls)).toContain(mode === "lost fold" ? "fold stack" : "internal stack");
          expect(JSON.stringify(errors.mock.calls)).toContain("disk unavailable");
        }
        router.send({ kind: "cancel" });
        expect(router.screen(view).title).toBe(before);
        expect(router.screen(view).body.kind).toBe("list");
      } finally {
        router.stop();
        stop();
        write.mockRestore();
        errors.mockRestore();
      }
    }));
}
