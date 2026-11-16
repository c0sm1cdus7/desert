import { OutsideDefect } from "../../fields/program-call.ts";
// The three kinds of failure have distinct public results, diagnostics and an Escape back to the same tool.
import { expect, it, vi } from "vitest";
import { shopProgram, shopShown, paymentsTool, salesTool } from "../../../tests/support/shop.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { cast, staged } from "./promised-stage.ts";
import { type, view } from "./promised-keys.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
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
const reacted = (kind = "sale-registered") => ({
  ...shopProgram,
  registry: [
    paymentsTool,
    {
      ...salesTool,
      effects: (_state: unknown, event: { kind: string }) => {
        if (event.kind === kind) throw new Error("effects stack");
        return [];
      },
    },
  ],
});
const listened = {
  ...shopProgram,
  registry: [
    paymentsTool,
    {
      ...salesTool,
      start: (
        ports: import("../../tools/startup-contract.ts").ToolStartup<import("../../../tests/support/shop.ts").Shop>,
      ) =>
        ports.bus.on("sale-registered", () => {
          throw new Error("program listener diagnostic");
        }),
    },
  ],
};
const tested = (mode: string) => {
  if (mode === "effects") return reacted();
  if (mode === "effects initial") return reacted("act");
  if (mode === "effects started") return reacted("act-started");
  if (mode === "effects result") return reacted("act-result");
  if (mode === "program listener") return listened;
  if (mode === "fold") return folded;
  if (mode === "lost fold") return folded;
  return mode === "program" || mode === "lost" ? broken : shopProgram;
};
const publicReason = (mode: string) => {
  if (mode.startsWith("effects")) return "E-PROG-1";
  if (["program", "effects", "fold", "escaped program", "program listener"].includes(mode)) return "E-PROG-1";
  if (mode === "port") return "servicio sin respuesta";
  return mode === "port without cause" ? toolTexts.disconnected : "E-BASE-1";
};
for (const mode of [
  "program",
  "effects",
  "effects initial",
  "effects started",
  "effects result",
  "program listener",
  "fold",
  "journal",
  "listener",
  "lost",
  "lost fold",
  "port",
  "raw port",
  "async escape",
  "escaped program",
  "port without cause",
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
        if (mode === "port") throw new PortFailure("servicio sin respuesta", new Error("port stack"));
        if (mode === "port without cause") throw new PortFailure(undefined, new Error("port stack"));
        if (mode === "raw port") throw new Error("ECONNRESET at internal host");
        if (mode === "escaped program") throw new OutsideDefect(new Error("escaped program diagnostic"));
        if (mode === "async escape")
          return {
            status: "processing",
            effects: [],
            completion: Promise.reject(new Error("escaped async diagnostic")),
          };
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
        if (publicReason(mode) !== "E-PROG-1") expect(screen).not.toContain("E-PROG-1");
        const record = JSON.stringify(house().tools.state().entries);
        if (mode === "program listener") expect(record).toContain("program listener diagnostic");
        if (mode.startsWith("effects")) expect(record).toContain("effects stack");
        if (mode === "fold") expect(record).toContain("fold stack");
        if (mode === "program") expect(record).toContain("internal stack");
        if (mode === "raw port") {
          expect(screen).not.toContain(toolTexts.disconnected);
          expect(record).toContain("ECONNRESET");
        }
        if (mode === "async escape") expect(record).toContain("escaped async diagnostic");
        if (mode === "escaped program") expect(record).toContain("escaped program diagnostic");
        if (mode.startsWith("port")) expect(record).toContain("port stack");
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
