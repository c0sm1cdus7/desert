// s06: independent V8 heaps, using exactly the production transfer and receiver.
import { readFileSync } from "node:fs";
import { stateTransfer } from "../../src/doors/socket/state/state-transfer.ts";
import { stateReceiver } from "../../src/doors/socket/state/state-receiver.ts";
import { frameReader } from "../../src/doors/socket/wire/frame.ts";
import { readServer } from "../../src/doors/socket/wire/protocol.ts";
function sequenced(value: unknown): value is { through: number } {
  return value !== null && typeof value === "object" && "through" in value && typeof value.through === "number";
}
if (process.argv[2] === "house") {
  const rates = (process.argv[3] ?? "21,10.5").split(",").map(Number);
  const line = (rate: number) => ({ rate, base: 100 });
  const first = { through: 1, items: [line(rates[0] ?? 21)] };
  const next = { through: 2, items: [...first.items, line(rates[1] ?? 10.5)] };
  for (const frames of [
    stateTransfer(first, undefined, 0),
    stateTransfer(next, first, 0),
    stateTransfer(next, undefined, 0),
  ])
    process.stdout.write(Buffer.concat(frames));
} else {
  const receiver = stateReceiver();
  let view: { through: number } | undefined;
  let verified = 0;
  const reader = frameReader("server", value => {
    if (Buffer.isBuffer(value)) {
      const result = receiver.accept(value, view);
      if (result) {
        const next = result.value;
        if (!sequenced(next)) throw new Error("Missing fixture sequence");
        view = next;
        verified++;
      }
    } else {
      const message = readServer(value);
      if (message.tipo === "estado") receiver.begin(message);
    }
  });
  reader.push(readFileSync(0));
  process.stdout.write(`${verified} verified\n`);
}
