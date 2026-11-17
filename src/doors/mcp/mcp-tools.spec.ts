import { afterEach, expect, it, vi } from "vitest";
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
it("reads the identity's scene and addressed part, tools and terminal notices", async () => {
  const h = setup();
  h.rig.bus.emit(
    effect("scene", { general: "El almacén abre", to: { beto: "Ordenar ventas", ana: "Parte ajena" } }, "ana"),
  );
  await h.call("actuar", { herramienta: "sales", accion: "register", datos: { sale: "pendiente", total: 100 } });
  const response = await h.call("leer", {}, h.beto);
  expect(response.body).toContain("El almacén abre");
  expect(response.body).toContain("Ordenar ventas");
  expect(response.body).not.toContain("Parte ajena");
  expect(response.body).toContain("sales");
  expect(response.body).not.toContain("payments");
  expect(response.body).toContain("Registrada · pendiente");
});
it("reads a tool through the same view and never emits terminal escapes", async () => {
  const h = setup();
  await h.call("actuar", { herramienta: "sales", accion: "register", datos: { sale: "venta", total: 100 } });
  const response = await h.call("leer", { herramienta: "sales" });
  const result: unknown = JSON.parse(response.body);
  expect(result).toMatchObject({
    result: { content: [{ text: h.house.registry[0]?.view(h.rig.state(), "sales", { recentLines: 20, now: 0 }) }] },
  });
  expect(response.body.includes("\u001b")).toBe(false);
  expect(JSON.parse((await h.call("leer", { herramienta: "payments" }, h.beto)).body)).toMatchObject({
    result: { isError: true },
  });
});
it("lists only granted actions and respects a narrower kit at execution time", async () => {
  const h = setup();
  const list = await h.call("acciones", {}, h.beto);
  expect(list.body).toContain("register");
  expect(list.body).toContain("properties");
  expect(list.body).not.toContain("receive");
  expect(JSON.parse((await h.call("acciones", {}, h.carla)).body)).toMatchObject({
    result: { content: [{ text: "[]" }] },
  });
  const before = h.rig.state().through;
  const denied = await h.call(
    "actuar",
    { herramienta: "payments", accion: "receive", datos: { payment: "x", amount: 1 } },
    h.beto,
  );
  expect(JSON.parse(denied.body)).toMatchObject({ result: { isError: true } });
  expect(h.rig.state().through).toBe(before);
  h.rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: [] }, "ana"));
  expect((await h.call("acciones", {}, h.beto)).body).not.toContain("register");
  expect(
    JSON.parse(
      (await h.call("actuar", { herramienta: "sales", accion: "register", datos: { sale: "x", total: 1 } }, h.beto))
        .body,
    ),
  ).toMatchObject({ result: { isError: true } });
});
it("acts with the socket book, accepts once and explains a refusal", async () => {
  const h = setup();
  const args = { herramienta: "sales", accion: "register", datos: { sale: "uno", total: 100 } };
  const accepted = await h.call("actuar", args, h.beto);
  expect(JSON.parse(accepted.body)).toMatchObject({ result: { isError: false } });
  expect(accepted.body).toContain("Registrada · uno");
  expect(JSON.parse(accepted.body)).toMatchObject({ result: { content: [{ text: "Registrada · uno" }] } });
  const rejected = await h.call("actuar", args, h.beto);
  expect(JSON.parse(rejected.body)).toMatchObject({ result: { isError: true } });
  expect(rejected.body).toContain("repeated");
  const acts = h.rig.facts().filter(event => event.layer === "house" && event.kind === "act");
  expect(acts.every(event => event.cause.some(cause => cause.startsWith("socket-request:")))).toBe(true);
  expect(h.rig.state().tools.sales.get("uno")?.by).toBe("beto");
});
it("cannot cross a target into another tool or bypass the act size limit", async () => {
  const h = setup();
  const crossed = await h.call("actuar", {
    herramienta: "sales",
    accion: "receive",
    objetivo: "payments",
    datos: { payment: "x", amount: 1 },
  });
  expect(JSON.parse(crossed.body)).toMatchObject({ result: { isError: true } });
  const tooBig = await h.call("actuar", {
    herramienta: "sales",
    accion: "register",
    datos: { sale: "x".repeat(actLimits.inputBytes), total: 1 },
  });
  expect(tooBig.status).toBe(200);
  expect(JSON.parse(tooBig.body)).toMatchObject({ result: { isError: true } });
  expect(h.rig.state().tools.sales.size).toBe(0);
});
it("waits for an actual change and returns immediately for an older sequence", async () => {
  const h = setup();
  const since = h.rig.state().through;
  const waiting = h.call("esperar", { desde: since, segundos: 60 });
  await vi.waitFor(() => expect(h.rig.state().through).toBe(since));
  h.rig.bus.emit(effect("scene", { general: "Cambió" }, "ana"));
  expect((await waiting).body).toContain('cambio\\\":true');
  expect((await h.call("esperar", { desde: since, segundos: 60 })).body).toContain('cambio\\\":true');
});
it("times out without a change and caps waiting at sixty seconds", async () => {
  vi.useFakeTimers();
  const h = setup();
  const waiting = h.call("esperar", { desde: h.rig.state().through, segundos: 999 });
  await vi.advanceTimersByTimeAsync(59_999);
  let done = false;
  void waiting.then(() => {
    done = true;
  });
  await Promise.resolve();
  expect(done).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect((await waiting).body).toContain('cambio\\\":false');
});
it("releases waits at door close and rejects removed identities before reading", async () => {
  const h = setup();
  const waiting = h.call("esperar", { desde: h.rig.state().through, segundos: 60 });
  await h.door.close();
  await waiting;
  const other = setup();
  other.rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  expect((await other.call("leer", {}, other.beto)).status).toBe(401);
});
