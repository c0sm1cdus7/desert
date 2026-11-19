// Reproduce revocation between acts and during a body without cutting another credential.
import { afterEach, expect, it } from "vitest";
import { doorHouse, invitationCode, rpcRequest } from "../../../tests/support/door-house.ts";
const opened: ReturnType<typeof doorHouse>[] = [];
afterEach(() => opened.splice(0).forEach(h => h.close()));
const sale = (name: string) => ({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name: "actuar", arguments: { programa: "sales", accion: "register", datos: { sale: name, total: 1500 } } },
});
it("does not start register after revocation between attend and register", async () => {
  const h = doorHouse();
  opened.push(h);
  await h.act("new", { identity: "luz", tools: ["sales"] });
  const key = h.access().redeem(invitationCode(await h.act("invite", { door: "agent" }, "identities/luz"))).key;
  if (!key) throw new Error("Missing synthetic credential");
  const id = h.access().get(key)?.id;
  const door = h.door();
  let scheduled = false;
  const stop = h.house().bus.on(event => {
    if (!scheduled && event.kind === "act-result" && event.by === "luz") {
      scheduled = true;
      queueMicrotask(() => {
        void h.act("revoke-key", { key: id }, "identities/luz");
      });
    }
  });
  try {
    expect((await door.handle(rpcRequest(key, sale("after-revoke")))).status).toBe(401);
    await new Promise(resolve => setImmediate(resolve));
    expect(h.house().tools.state().tools.sales.has("after-revoke")).toBe(false);
    expect(
      h
        .house()
        .journal.replay(
          false,
          (found, event) => found || (event.kind === "act" && event.by === "luz" && event.data.option === "register"),
        ),
    ).toBe(false);
  } finally {
    stop();
    await door.close();
  }
});
it("does not run a body released after revocation and leaves two other credentials usable", async () => {
  const h = doorHouse();
  opened.push(h);
  const issue = async () =>
    h.access().redeem(invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"))).key;
  const key = await issue(),
    other = await issue();
  if (!key || !other) throw new Error("Missing synthetic credentials");
  const door = h.door();
  let release = () => {};
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  const pending = door.handle({
    ...rpcRequest(key),
    body: async function* () {
      await blocked;
      yield Buffer.from(JSON.stringify(sale("body-revoked")));
    },
  });
  try {
    await h.act("revoke-key", { key: h.access().get(key)?.id }, "identities/beto");
    expect((await pending).status).toBe(401);
    release();
    await new Promise(resolve => setImmediate(resolve));
    expect(h.house().tools.state().tools.sales.has("body-revoked")).toBe(false);
    expect((await door.handle(rpcRequest(other))).status).toBe(200);
    expect((await door.handle(rpcRequest(h.founder))).status).toBe(200);
  } finally {
    release();
    await door.close();
  }
});
