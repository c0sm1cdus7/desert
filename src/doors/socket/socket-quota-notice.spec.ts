import { performance } from "node:perf_hooks";
import { duplexPair } from "node:stream";
import { expect, it, vi } from "vitest";
import { socketConnection } from "./socket-connection.ts";
import { serverFrame } from "./frame.ts";
import { stateTransfer } from "./state-transfer.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { houseProtocolVersion } from "../../catalogs/levers.ts";
it("N8: the terminal visibly reports a quota refusal once per second and keeps reading", async () => {
  const pair = duplexPair();
  const connection = socketConnection("fixture");
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  let now = 0;
  const clock = vi.spyOn(performance, "now").mockImplementation(() => now);
  pair[1].resume();
  const entering = connection.attach(pair[0]);
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
  const state = { through: 1, by: "ana", house: {}, tools: {}, acts: new Map(), entries: [] };
  for (const frame of stateTransfer(state, undefined, 0)) pair[1].write(frame);
  try {
    await entering;
    for (let i = 0; i < 100; i++)
      pair[1].write(serverFrame({ tipo: "rechazo", id: "defecto", motivo: socketTexts.quota }));
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(output).toHaveBeenCalledExactlyOnceWith(`${socketTexts.quota}\n`);
    expect(connection.status()).toBe("connected");
    now = 1000;
    pair[1].write(serverFrame({ tipo: "rechazo", id: "wait", motivo: socketTexts.quota }));
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(output).toHaveBeenCalledTimes(2);
    expect(connection.state()).toEqual(state);
  } finally {
    connection.close();
    pair[1].destroy();
    clock.mockRestore();
    output.mockRestore();
    await entering;
  }
});
