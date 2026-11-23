import { mkdtempSync, rmSync } from "node:fs";
import { said } from "../fields/phrases.ts";
import { expect, it } from "vitest";
import { probe } from "../../tests/support/socket-probe.ts";
import { crashClient } from "../../tests/support/crash-client.ts";
const request = {
  type: "act",
  id: "lost",
  act: "register",
  target: "sales",
  input: { sale: "one", total: 500 },
  through: 0,
};
it.each(["recorded", "before", "during", "result", "after"])(
  "killing the house %s the effect never replays a possibly committed request",
  async mode => {
    const home = mkdtempSync("/tmp/house-crash-");
    const first = await crashClient(home, mode);
    let second: Awaited<ReturnType<typeof crashClient>> | undefined;
    try {
      const a = await probe(first.stream);
      a.hello();
      expect(await a.until(() => a.states.length > 0)).toBe(true);
      a.send({ type: "act", id: "attend", act: "attend", input: { target: "sales" }, through: 0 });
      expect((await a.result("attend"))?.status).toBe("accepted");
      a.send(request);
      await first.exited;
      expect(a.messages.some(m => m.type === "result" && m.id === "lost")).toBe(false);
      second = await crashClient(home);
      const b = await probe(second.stream);
      b.hello();
      expect(await b.until(() => b.states.length > 0)).toBe(true);
      b.send({ type: "read", id: "lost", what: "request" });
      const recovered = await b.result("lost");
      expect(recovered?.status).toBe(mode === "after" ? "accepted" : "interrupted");
      if (mode !== "after") expect(said(recovered?.reason ?? "", "es")).toContain("Actividad");
      const count = b.messages.length;
      b.send(request);
      expect(await b.until(() => b.messages.length > count)).toBe(true);
      expect(b.messages.at(-1)).toEqual(recovered);
      const view = b.states.at(-1);
      expect(view).toMatchObject({
        tools: {
          sales:
            mode === "after" || mode === "result" ? new Map([["one", { total: 500, paid: 0, by: "ana" }]]) : new Map(),
        },
      });
    } finally {
      await first.close();
      await second?.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
);
