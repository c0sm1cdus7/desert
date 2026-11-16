// A separate house heap with two framed streams over IPC; no external socket or model provider.
import { duplexPair } from "node:stream";
import { socketHouse } from "./socket-house.ts";
import { identityView } from "../../src/house/house.ts";
import { stateHash } from "../../src/doors/socket/state-hash.ts";
import { shop } from "./shop.ts";
const f = await socketHouse("stream");
const streams = [duplexPair(), duplexPair()];
for (const [terminal, pair] of streams.entries()) {
  f.attach(pair[1]);
  pair[0].on("data", (bytes: Buffer) => process.send?.({ terminal, bytes: bytes.toString("base64") }));
}
process.on("message", (message: unknown) => {
  if (!message || typeof message !== "object" || !("op" in message)) return;
  if (
    message.op === "bytes" &&
    "terminal" in message &&
    typeof message.terminal === "number" &&
    "bytes" in message &&
    typeof message.bytes === "string"
  )
    streams[message.terminal]?.[0].write(Buffer.from(message.bytes, "base64"));
  if (message.op === "view")
    process.send?.({ views: ["ana", "beto"].map(by => stateHash(identityView(f.house().tools.state(), by))) });
  if (message.op === "legacy") {
    f.house().bus.emit(shop.fact("sale-registered", { sale: "legacy", total: -0 }, "ana"));
    process.send?.({ legacy: true });
  }
});
process.on("disconnect", () => {
  streams.forEach(pair => pair.forEach(stream => stream.destroy()));
  void f.close();
});
process.send?.({ ready: true });
