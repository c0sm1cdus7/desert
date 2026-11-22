import { afterEach, expect, it } from "vitest";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { socketLimits } from "../socket/wire/protocol.ts";

const houses: ReturnType<typeof mcpHouse>[] = [];
afterEach(async () => {
  await Promise.all(houses.splice(0).map(house => house.close()));
});
it("answers 429 past the socket's requests per second, per identity and before reading the body", async () => {
  const h = mcpHouse();
  houses.push(h);
  const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
  const statuses = await Promise.all(Array.from({ length: socketLimits.requests + 1 }, () => h.request(ping)));
  expect(statuses.filter(response => response.status === 200)).toHaveLength(socketLimits.requests);
  const refused = statuses.filter(response => response.status === 429);
  expect(refused).toHaveLength(1);
  expect(refused[0]?.headers["Retry-After"]).toBe("1");
  expect((await h.request(ping, h.beto)).status).toBe(200);
});
it("refuses a wait past the bound of open waits for one identity, and frees it when a wait ends", async () => {
  const h = mcpHouse();
  houses.push(h);
  const since = h.house.tools.state().through;
  const open = Array.from({ length: socketLimits.waits }, () => h.call("wait", { since, seconds: 60 }));
  const refused = await h.call("wait", { since, seconds: 60 });
  expect(JSON.parse(refused.body)).toMatchObject({ error: { code: -32000 } });
  await h.call("act", { program: "sales", action: "register", data: { sale: "woken", total: 100 } });
  expect((await Promise.all(open)).every(response => response.body.includes('\\"changed\\":true'))).toBe(true);
  const again = await h.call("wait", { since: h.house.tools.state().through, seconds: 0 });
  expect(JSON.parse(again.body)).toMatchObject({ result: { isError: false } });
});
