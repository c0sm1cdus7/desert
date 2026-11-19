import { afterEach, expect, it, vi } from "vitest";
import { mcpResult, mcpActions } from "../../../tests/support/mcp-results.ts";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { effect } from "../../house/facts.ts";
import { actLimits } from "../../house/own-acts.ts";
const opened: ReturnType<typeof mcpHouse>[] = [];
const setup = () => {
  const h = mcpHouse();
  opened.push(h);
  return h;
};
afterEach(async () => {
  vi.useRealTimers();
  for (const h of opened.splice(0)) await h.close();
});
it("reads every scene, addressed part, program and terminal notice independently of the action kit", async () => {
  const h = setup();
  h.rig.bus.emit(
    effect("scene", { general: "El almacén abre", to: { beto: "Ordenar ventas", ana: "Parte ajena" } }, "ana"),
  );
  await h.call("act", { program: "sales", action: "register", data: { sale: "pendiente", total: 100 } });
  const response = await h.call("read", {}, h.beto);
  expect(response.body).toContain("El almacén abre");
  expect(response.body).toContain("Ordenar ventas");
  expect(response.body).toContain("Parte ajena");
  expect(response.body).toContain("sales");
  expect(response.body).toContain("payments");
  expect(response.body).toContain("Registrada · pendiente");
});
it("reads a tool through the same view and never emits terminal escapes", async () => {
  const h = setup();
  await h.call("act", { program: "sales", action: "register", data: { sale: "venta", total: 100 } });
  const response = await h.call("read", { program: "sales" });
  const result: unknown = JSON.parse(response.body);
  expect(result).toMatchObject({
    result: { content: [{ text: h.house.registry[0]?.view(h.rig.state(), "sales", { recentLines: 20, now: 0 }) }] },
  });
  expect(response.body.includes("\u001b")).toBe(false);
  const payments = mcpResult((await h.call("read", { program: "payments" }, h.beto)).body);
  expect(payments.isError).toBe(false);
  expect(payments.content[0]?.text).toBe(
    h.house.registry.find(tool => tool.id === "payments")?.view(h.rig.state(), "payments", { recentLines: 20, now: 0 }),
  );
  expect(
    mcpResult(
      (await h.call("act", { program: "payments", action: "receive", data: { payment: "denied", amount: 1 } }, h.beto))
        .body,
    ).isError,
  ).toBe(true);
});
it("lists only granted actions and respects a narrower kit at execution time", async () => {
  const h = setup();
  const list = await h.call("actions", {}, h.beto);
  expect(list.body).toContain("register");
  expect(list.body).toContain("properties");
  expect(list.body).not.toContain("receive");
  expect(JSON.parse((await h.call("actions", {}, h.carla)).body)).toMatchObject({
    result: { content: [{ text: "[]" }] },
  });
  const before = h.rig.state().through;
  const denied = await h.call(
    "act",
    { program: "payments", action: "receive", data: { payment: "x", amount: 1 } },
    h.beto,
  );
  expect(JSON.parse(denied.body)).toMatchObject({ result: { isError: true } });
  expect(h.rig.state().through).toBe(before);
  h.rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: [] }, "ana"));
  expect((await h.call("actions", {}, h.beto)).body).not.toContain("register");
  expect(
    JSON.parse(
      (await h.call("act", { program: "sales", action: "register", data: { sale: "x", total: 1 } }, h.beto)).body,
    ),
  ).toMatchObject({ result: { isError: true } });
});
it("keeps ordinary Tool readings and action targets while accepting an explicit object", async () => {
  const h = setup();
  await h.call("act", { program: "sales", action: "register", data: { sale: "venta", total: 100 } });
  const tool = h.house.registry.find(tool => tool.id === "sales");
  const target = tool?.targets(h.rig.state())[0];
  if (!tool || !target) throw new Error("Missing sale target");
  const response: unknown = JSON.parse((await h.call("read", { program: "sales", target: target }, h.beto)).body);
  expect(response).toMatchObject({
    result: {
      isError: false,
      content: [
        {
          text: tool.view(h.rig.state(), target, { recentLines: 20, now: Date.now() }),
        },
      ],
    },
  });
  expect((await h.call("read", { program: "sales", target: "sales" })).body).toBe(
    (await h.call("read", { program: "sales" })).body,
  );
  const actions = mcpActions(mcpResult((await h.call("actions", { program: "sales" }, h.beto)).body));
  const filtered = mcpActions(mcpResult((await h.call("actions", { program: "sales", target: target }, h.beto)).body));
  expect(filtered).toEqual(actions.filter(action => action.target === target));
  const outsideKit = mcpResult((await h.call("read", { program: "sales", target: target }, h.carla)).body);
  expect(outsideKit.isError).toBe(false);
  expect(outsideKit.content[0]?.text).toBe(tool.view(h.rig.state(), target, { recentLines: 20, now: Date.now() }));
  const before = h.rig.state().through;
  expect(
    mcpResult(
      (await h.call("act", { program: "sales", action: "register", data: { sale: "denied", total: 1 } }, h.carla)).body,
    ).isError,
  ).toBe(true);
  expect(h.rig.state().through).toBe(before);
});
it("acts with the socket book, accepts once and explains a refusal", async () => {
  const h = setup();
  const args = { program: "sales", action: "register", data: { sale: "uno", total: 100 } };
  const accepted = await h.call("act", args, h.beto);
  expect(JSON.parse(accepted.body)).toMatchObject({ result: { isError: false } });
  expect(accepted.body).toContain("Registrada · uno");
  expect(JSON.parse(accepted.body)).toMatchObject({ result: { content: [{ text: "Registrada · uno" }] } });
  const rejected = await h.call("act", args, h.beto);
  expect(JSON.parse(rejected.body)).toMatchObject({ result: { isError: true } });
  expect(rejected.body).toContain("repeated");
  const acts = h.rig.facts().filter(event => event.layer === "house" && event.kind === "act");
  expect(acts.every(event => event.cause.some(cause => cause.startsWith("socket-request:")))).toBe(true);
  expect(h.rig.state().tools.sales.get("uno")?.by).toBe("beto");
});
it("cannot cross a target into another tool or bypass the act size limit", async () => {
  const h = setup();
  const crossed = await h.call("act", {
    program: "sales",
    action: "receive",
    target: "payments",
    data: { payment: "x", amount: 1 },
  });
  expect(JSON.parse(crossed.body)).toMatchObject({ result: { isError: true } });
  const tooBig = await h.call("act", {
    program: "sales",
    action: "register",
    data: { sale: "x".repeat(actLimits.inputBytes), total: 1 },
  });
  expect(tooBig.status).toBe(200);
  expect(JSON.parse(tooBig.body)).toMatchObject({ result: { isError: true } });
  expect(h.rig.state().tools.sales.size).toBe(0);
});
it("waits for an actual change and returns immediately for an older sequence", async () => {
  const h = setup();
  const since = h.rig.state().through;
  const waiting = h.call("wait", { since: since, seconds: 60 });
  await vi.waitFor(() => expect(h.rig.state().through).toBe(since));
  h.rig.bus.emit(effect("scene", { general: "Cambió" }, "ana"));
  expect((await waiting).body).toContain('changed\\\":true');
  expect((await h.call("wait", { since: since, seconds: 60 })).body).toContain('changed\\\":true');
});
it("times out without a change and caps waiting at sixty seconds", async () => {
  vi.useFakeTimers();
  const h = setup();
  const waiting = h.call("wait", { since: h.rig.state().through, seconds: 999 });
  await vi.advanceTimersByTimeAsync(59_999);
  let done = false;
  void waiting.then(() => {
    done = true;
  });
  await Promise.resolve();
  expect(done).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect((await waiting).body).toContain('changed\\\":false');
});
it("releases waits at door close and rejects removed identities before reading", async () => {
  const h = setup();
  const waiting = h.call("wait", { since: h.rig.state().through, seconds: 60 });
  await h.door.close();
  await waiting;
  const other = setup();
  other.rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect((await other.call("read", {}, other.beto)).status).toBe(401);
});
