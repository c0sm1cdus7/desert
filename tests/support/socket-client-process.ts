// Separate client process: socket bytes only, no house or storage import.
import { probe } from "./socket-probe.ts";
const path = process.argv[2];
if (!path) throw new Error("Missing socket path");
const client = await probe(path);
client.hello("ana-terminal");
if (!(await client.until(() => client.messages.some(m => m.type === "welcome")))) process.exitCode = 1;
else {
  client.send({
    type: "act",
    id: process.argv[3] ?? "test",
    act: "prefer",
    input: { hide: "empty", on: true },
    through: 0,
  });
  const result = await client.result(process.argv[3] ?? "test");
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result?.status !== "accepted") process.exitCode = 1;
}
client.socket.end();
