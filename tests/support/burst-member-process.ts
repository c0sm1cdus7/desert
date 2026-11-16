// A second process sends a packed burst over the same framed transport and checks every payment receipt.
import { Duplex } from "node:stream";
import { probe } from "./socket-probe.ts";
import { clientFrame } from "../../src/doors/socket/frame.ts";
const path = process.argv[2];
const transport = path ?? Duplex.from({ readable: process.stdin, writable: process.stdout });
const client = await probe(transport);
client.hello("beto-terminal");
await client.until(() => client.states.length === 1, 30000);
client.send({ tipo: "acto", id: "attend", act: "attend", input: { target: "payments" }, through: 0 });
await client.result("attend");
process.send?.({ ready: true });
process.on("message", () => {
  const frames = [];
  for (let i = 0; i < 2000; i++)
    frames.push(clientFrame({ tipo: "defecto", tool: "payments", target: "payments", option: "receive" }));
  for (let i = 0; i < 300; i++)
    frames.push(
      clientFrame({
        tipo: "acto",
        id: `p${i}`,
        act: "receive",
        target: "payments",
        input: { payment: `p${i}`, amount: 1 },
        through: 0,
      }),
    );
  client.socket.write(Buffer.concat(frames));
  void client
    .until(() => client.messages.filter(m => m.tipo === "resultado").length === 301, 60000)
    .then(() => {
      const results = client.messages.filter(m => m.tipo === "resultado" && m.id !== "attend");
      process.send?.({
        payments: results.length,
        accepted: results.filter(m => m.tipo === "resultado" && m.status === "accepted").length,
        closed: client.closed(),
      });
    });
});
process.on("disconnect", () => {
  client.socket.destroy();
  process.stdin.destroy();
  process.stdout.destroy();
});
