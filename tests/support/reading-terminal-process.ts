// A real terminal in a separate heap. Its only job is reading; IPC asks for a verified sequence, never acts.
import { Duplex } from "node:stream";
import { connect } from "node:net";
import { socketConnection } from "../../src/doors/socket/client/socket-connection.ts";
import { stateHash } from "../../src/doors/socket/state/state-hash.ts";
const connection = socketConnection("ana-terminal");
const path = process.argv[2];
const stream = path ? connect(path) : Duplex.from({ readable: process.stdin, writable: process.stdout });
let cut = false;
connection.receive(message => {
  if (message.tipo === "cortado") cut = true;
});
await connection.attach(stream);
process.send?.({ ready: true });
process.on("message", (value: unknown) => {
  if (!value || typeof value !== "object" || !("through" in value) || typeof value.through !== "number") return;
  const through = value.through;
  let stop = () => {};
  const report = () => {
    if (connection.status() === "connected" && connection.state().through < through) return;
    stop();
    process.send?.({
      through: connection.state().through,
      hash: stateHash(connection.state()),
      status: connection.status(),
      cut,
    });
  };
  stop = connection.watch(report);
  report();
});
process.on("disconnect", () => {
  connection.close();
  process.stdin.destroy();
  process.stdout.destroy();
});
