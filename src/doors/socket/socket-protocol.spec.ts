import { afterEach, describe, expect, it } from "vitest";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { wire } from "../../../tests/support/socket-probe.ts";
describe.each(["stream", "unix"] as const)("%s", transport => {
  let fixture: Awaited<ReturnType<typeof socketHouse>> | undefined;
  afterEach(async () => {
    await fixture?.close();
    fixture = undefined;
  });
  const setup = async () => {
    fixture = await socketHouse(transport);
    return fixture;
  };
  it.each([{ protocolo: 999 }, { node: "0.0.0" }])("rejects incompatible hello with both versions: %j", async extra => {
    const f = await setup();
    const c = await f.client();
    c.hello("ana-terminal", extra);
    await c.until(c.closed);
    expect(c.messages[0]?.tipo).toBe("rechazo");
    const first = c.messages[0];
    const reason = first?.tipo === "rechazo" ? first.motivo : "";
    expect(reason).toContain("protocolo" in extra ? "999" : "0.0.0");
    expect(reason).toContain("protocolo" in extra ? "1" : process.versions.node);
    expect(c.states).toHaveLength(0);
  });
  it.each(["oversize", "json", "schema", "v8", "unknown", "zero"])("invalid %s closes only that peer", async kind => {
    const f = await setup();
    const good = await f.client("ana-terminal");
    expect(good.states).toHaveLength(1);
    const before = f.house().tools.state().through;
    const bad = await f.client();
    let bytes = wire({ tipo: "hola", protocolo: "one" });
    if (kind === "oversize") {
      bytes = Buffer.alloc(5);
      bytes.writeUInt32BE(1024 * 1024 + 2);
    }
    if (kind === "json") {
      bytes = Buffer.from([0, 0, 0, 2, 0, 123]);
    }
    if (kind === "v8") bytes = wire(null, 1);
    if (kind === "unknown") bytes = wire(null, 9);
    if (kind === "zero") bytes = Buffer.alloc(5);
    bad.socket.write(bytes);
    expect(await bad.until(bad.closed)).toBe(true);
    expect(f.house().tools.state().through).toBe(before);
    expect(good.closed()).toBe(false);
    expect(bad.states).toHaveLength(0);
  });
  it("hello expires after five seconds, with no house data before authentication", async () => {
    const f = await setup();
    const c = await f.client();
    const started = Date.now();
    expect(c.closed()).toBe(false);
    expect(await c.until(c.closed, 5500)).toBe(true);
    expect(Date.now() - started).toBeGreaterThanOrEqual(4800);
    expect(c.messages).toHaveLength(0);
    expect(c.states).toHaveLength(0);
  }, 7000);
  it("an agent key cannot declare a terminal door and receives no binary state", async () => {
    const f = await setup();
    const c = await f.client("beto-agente");
    expect(c.messages[0]?.tipo).toBe("bienvenida");
    expect(c.states).toHaveLength(0);
    const forged = await f.client();
    forged.hello("beto-agente", { puerta: "terminal", identidad: "ana" });
    expect(await forged.until(forged.closed)).toBe(true);
    expect(forged.states).toHaveLength(0);
    expect(forged.messages).toHaveLength(0);
  });
});
