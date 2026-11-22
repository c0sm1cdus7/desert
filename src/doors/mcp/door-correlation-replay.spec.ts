// Replayed compound identifiers still deduplicate actions and retrieve receipts after revocation and restart.
import { expect, it } from "vitest";
import { doorHouse, invitationCode } from "../../../tests/support/door-house.ts";
import { httpDoorFetch } from "../../../tests/support/http-door-fetch.ts";
import type { Shop } from "../../../tests/support/shop.ts";
import { connectRemoteTerminal } from "../terminal/remote-terminal-client.ts";
import { requestDigest } from "../socket/requests/public-message.ts";
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 40));
it.each(["whole", "compound"])("deduplicates %s identifiers across journal replay", async mode => {
  const h = doorHouse();
  const key = h.access().redeem(invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"))).key;
  if (!key) throw new Error("Missing test key");
  const id = mode === "whole" ? key : `word_${key}-end`;
  const action = { type: "act", id, act: "prefer", input: { hide: "empty", on: true }, through: 0 } as const;
  try {
    for (const restart of [false, true]) {
      if (restart) {
        await h.act("revoke-key", { key: h.access().get(key)?.id }, "identities/beto");
        h.reopen();
      }
      const door = h.door(),
        transport = httpDoorFetch(door.handle);
      const client = await connectRemoteTerminal<Shop>("http://localhost/mcp", h.founder, transport.send);
      const messages: unknown[] = [];
      client.receive(message => messages.push(message));
      try {
        client.send(action);
        await tick();
        client.send({ type: "read", id, what: "request" });
        await tick();
        expect(
          messages.filter(
            message =>
              typeof message === "object" && message !== null && "type" in message && message.type === "result",
          ),
        ).toHaveLength(2);
        expect(messages).toContainEqual(
          expect.objectContaining({
            type: "result",
            id: requestDigest(id),
            status: "accepted",
            correlation: "sha256",
          }),
        );
        client.send({ ...action, input: { hide: "empty", on: false } });
        await tick();
        expect(messages).toContainEqual(
          expect.objectContaining({ type: "rejection", id: requestDigest(id), correlation: "sha256" }),
        );
        expect(JSON.stringify(messages).includes(key)).toBe(false);
        const count = h
          .house()
          .journal.replay(
            0,
            (total, event) =>
              total + Number(event.layer === "house" && event.kind === "act" && event.data.option === "prefer"),
          );
        expect(count).toBe(1);
        expect(h.history().includes(key)).toBe(false);
      } finally {
        client.close();
        transport.disconnect();
        await door.close();
      }
    }
  } finally {
    h.close();
  }
});
