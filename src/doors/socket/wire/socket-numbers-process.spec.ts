import { fork } from "node:child_process";
import { once } from "node:events";
import { duplexPair } from "node:stream";
import { expect, it, vi } from "vitest";
import { socketConnection } from "../client/socket-connection.ts";
import { stateHash } from "../state/state-hash.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import type { ServerMessage } from "./protocol.ts";
it("s05: two processes survive rejected -0, legacy -0 and an ordinary sale", async () => {
  const child = fork("tests/support/state-house-process.ts", [], { silent: true });
  const exited = once(child, "exit");
  const messages: unknown[] = [];
  const pairs = [duplexPair(), duplexPair()];
  const clients = [socketConnection("ana-terminal"), socketConnection("beto-terminal")];
  const answers: ServerMessage[] = [];
  let output = "";
  child.stderr?.on("data", (bytes: Buffer) => {
    output += bytes.toString();
  });
  child.on("message", (message: unknown) => {
    if (
      message &&
      typeof message === "object" &&
      "terminal" in message &&
      typeof message.terminal === "number" &&
      "bytes" in message &&
      typeof message.bytes === "string"
    )
      pairs[message.terminal]?.[1].write(Buffer.from(message.bytes, "base64"));
    else messages.push(message);
  });
  try {
    await vi.waitFor(() => expect(messages).toContainEqual({ ready: true }));
    for (const [terminal, pair] of pairs.entries()) {
      pair[1].on("data", (bytes: Buffer) => child.send({ op: "bytes", terminal, bytes: bytes.toString("base64") }));
      const client = clients[terminal];
      if (!client) throw new Error("Missing fixture client");
      client.receive(message => answers.push(message));
      await client.attach(pair[0]);
      client.send({ type: "act", id: `att${terminal}`, act: "attend", input: { target: "sales" }, through: 0 });
    }
    await vi.waitFor(() => expect(answers.filter(m => m.type === "result")).toHaveLength(2));
    const body = Buffer.from(
      '{"type":"act","id":"negative","act":"register","target":"sales",' +
        '"input":{"sale":"gift","total":-0},"through":0}',
    );
    const header = Buffer.alloc(5);
    header.writeUInt32BE(body.length + 1);
    pairs[1]?.[0].write(Buffer.concat([header, body]));
    await vi.waitFor(() =>
      expect(answers).toContainEqual({ type: "rejection", id: "negative", reason: socketTexts.invalidData }),
    );
    child.send({ op: "legacy" });
    await vi.waitFor(() => expect(messages).toContainEqual({ legacy: true }));
    clients[0]?.send({
      type: "act",
      id: "ordinary",
      act: "register",
      target: "sales",
      input: { sale: "bread", total: 1500 },
      through: 0,
    });
    await vi.waitFor(() =>
      expect(answers).toContainEqual(expect.objectContaining({ type: "result", id: "ordinary", status: "accepted" })),
    );
    child.send({ op: "view" });
    await vi.waitFor(() =>
      expect(messages).toContainEqual({ views: clients.map(client => stateHash(client.state())) }),
    );
    expect(clients.map(client => client.status())).toEqual(["connected", "connected"]);
    expect(output).not.toContain(socketTexts.stateMismatch);
  } finally {
    clients.forEach(client => client.close());
    pairs.forEach(pair => pair.forEach(stream => stream.destroy()));
    if (child.connected) child.disconnect();
    const timeout = setTimeout(() => child.kill("SIGKILL"), 1000);
    await exited;
    clearTimeout(timeout);
  }
}, 10000);
