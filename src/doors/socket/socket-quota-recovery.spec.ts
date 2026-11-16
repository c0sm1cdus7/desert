import { duplexPair } from "node:stream";
import { expect, it, vi } from "vitest";
import { socketConnection } from "./socket-connection.ts";
import { clientRequests } from "./client-requests.ts";
import { frameReader, serverFrame } from "./frame.ts";
import { readClient } from "./protocol.ts";
import { stateTransfer } from "./state-transfer.ts";
import { houseProtocolVersion, socketLimits } from "../../catalogs/levers.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
it("a quota refusal retries a lost payment lookup without sending the act again", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const connection = socketConnection("fixture");
  const actIds: string[] = [],
    lookups: string[] = [],
    results: string[] = [];
  const pairs: ReturnType<typeof duplexPair>[] = [];
  const open = () => {
    const pair = duplexPair();
    pairs.push(pair);
    const reader = frameReader("client", value => {
      const message = readClient(value);
      if (message.tipo === "hola") {
        pair[1].write(
          serverFrame({
            tipo: "bienvenida",
            protocolo: houseProtocolVersion,
            identidad: "ana",
            admin: true,
            ahora: 0,
            seq: 1,
          }),
        );
        const view = { through: 1, by: "ana", house: {}, tools: {}, acts: new Map(), entries: [] };
        stateTransfer(view, undefined, 0).forEach(frame => pair[1].write(frame));
      } else if (message.tipo === "acto") actIds.push(message.id);
      else if (message.tipo === "leer") {
        lookups.push(message.id);
        pair[1].write(
          serverFrame(
            lookups.length === 1
              ? { tipo: "rechazo", id: message.id, motivo: socketTexts.quota }
              : { tipo: "resultado", id: message.id, status: "accepted", efectos: [] },
          ),
        );
      }
    });
    pair[1].on("data", (bytes: Buffer) => reader.push(bytes));
    return connection.attach(pair[0]);
  };
  connection.receive(message => {
    if (message.tipo === "resultado") results.push(message.id);
  });
  try {
    await open();
    const result = clientRequests(connection)({ act: "prefer", input: { hide: "empty", on: true } }, 0);
    await new Promise<void>(resolve => setImmediate(resolve));
    pairs[0]?.[1].destroy();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(result.status).toBe("processing");
    if (result.status === "processing") expect((await result.completion).status).toBe("interrupted");
    await open();
    await vi.advanceTimersByTimeAsync(0);
    expect(lookups).toEqual(actIds);
    await vi.advanceTimersByTimeAsync(socketLimits.requestMs);
    expect(lookups).toEqual([...actIds, ...actIds]);
    expect(results).toEqual(actIds);
    expect(actIds).toHaveLength(1);
  } finally {
    connection.close();
    pairs.forEach(pair => pair.forEach(s => s.destroy()));
    output.mockRestore();
    vi.useRealTimers();
  }
});
