import { expect, it } from "vitest";
import { duplexPair } from "node:stream";
import { serialize } from "node:v8";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { shopRegistry, type Shop } from "../../../../tests/support/shop.ts";
import { identityView } from "../../../house/members.ts";
import { stateResult } from "../../../journal/readonly-state.ts";
import { localPorts } from "../../../runtime/house-runtime.ts";
import { effect } from "../../../house/facts.ts";
import { settle } from "../../../surface/bridge/ports/house-ports.ts";
import { socketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
import { stateTransfer } from "../state/state-transfer.ts";
// Bytes and completed deliveries are load independent. Paired timings are reported, never a machine-load gate.
const limits = { bytesPerTerminal: 4096, repetitions: 6 };
it("measures acts with 100, 2000 and 20000 entries, local and with one or five terminals", async () => {
  for (const entries of [100, 2000, 20000]) {
    const f = await socketHouse("stream");
    try {
      f.house().journal.batch(() => {
        for (let n = 0; n < entries; n++)
          f.house().bus.emit(
            effect(
              "tool-entry",
              {
                tool: "payments",
                target: "payments",
                author: "ana",
                text: `Entrada ${n}`,
                silent: true,
              },
              "ana",
            ),
          );
      });
      const local = localPorts(f.house(), "ana", { recentLines: 40 });
      await settle(local.act({ act: "attend", input: { target: "payments" } }, 0));
      const times: number[] = [];
      for (let n = 0; n < limits.repetitions; n++) {
        const start = performance.now();
        expect((await settle(local.act(payment(`local-${n}`), 0))).status).toBe("accepted");
        times.push(performance.now() - start);
      }
      const localMs = median(times);
      // The state is a read-only membrane since the mind (0c): the measure reads its plain parts.
      const view = identityView(stateResult(f.house().tools.state()), "ana");
      const started = performance.now();
      const initialFrames = stateTransfer(view, undefined, f.house().now());
      const encodingMs = performance.now() - started;
      const initialBytes = initialFrames.reduce((sum, frame) => sum + frame.length, 0);
      for (const terminals of [1, 5]) await measureRemote(f, entries, terminals, localMs);
      process.stdout.write(
        `${JSON.stringify({
          measurement: "initial-state",
          entries,
          initialBytes,
          encodingMs,
          rawBytes: serialize(stateResult(view)).length,
        })}\n`,
      );
    } finally {
      await f.close();
    }
  }
}, 120000);
const payment = (payment: string) => ({ act: "receive", target: "payments", input: { payment, amount: 1 } });
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
async function measureRemote(
  f: Awaited<ReturnType<typeof socketHouse>>,
  entries: number,
  terminals: number,
  baselineLocalMs: number,
) {
  const clients = [];
  let bytes = 0;
  let deliveries = 0;
  for (let n = 0; n < terminals; n++) {
    const connection = socketConnection<Shop>("ana-terminal");
    const pair = duplexPair();
    f.attach(pair[1]);
    await connection.attach(pair[0]);
    pair[0].on("data", (chunk: Buffer) => {
      bytes += chunk.length;
    });
    connection.receive(message => {
      if (message.tipo === "estado") deliveries++;
    });
    clients.push({ connection, pair });
  }
  try {
    const first = clients[0];
    if (!first) throw new Error("Missing fixture client");
    const ports = socketPorts(first.connection, { registry: shopRegistry, limits: { recentLines: 40 } });
    const times: number[] = [];
    const localTimes: number[] = [];
    let measuredBytes = 0;
    let measuredDeliveries = 0;
    const local = localPorts(f.house(), "ana", { recentLines: 40 });
    for (let n = 0; n < limits.repetitions; n++) {
      const localStart = performance.now();
      expect((await settle(local.act(payment(`paired-${terminals}-${n}`), 0))).status).toBe("accepted");
      localTimes.push(performance.now() - localStart);
      await new Promise<void>(resolve => setImmediate(resolve));
      const beforeBytes = bytes,
        beforeDeliveries = deliveries;
      const start = performance.now();
      const done = await settle(ports.act(payment(`remote-${terminals}-${n}`), 0));
      await new Promise<void>(resolve => setImmediate(resolve));
      times.push(performance.now() - start);
      measuredBytes += bytes - beforeBytes;
      measuredDeliveries += deliveries - beforeDeliveries;
      expect(done.status).toBe("accepted");
      // Compare plain parts: walking the read-only membrane of 20.000 entries would measure the comparison instead.
      const view = stateResult(identityView(stateResult(f.house().tools.state()), "ana"));
      for (const c of clients) expect(c.connection.state()).toEqual(view);
    }
    const perAct = measuredBytes / limits.repetitions;
    const localMs = median(localTimes);
    const remoteMs = median(times);
    expect(perAct / terminals).toBeLessThan(limits.bytesPerTerminal);
    expect(measuredDeliveries).toBe(limits.repetitions * terminals);
    expect(clients.every(c => c.connection.status() === "connected")).toBe(true);
    process.stdout.write(
      `${JSON.stringify({
        measurement: "act-cost",
        entries,
        terminals,
        localMs,
        baselineLocalMs,
        deliveriesPerAct: measuredDeliveries / limits.repetitions,
        relativeTime: remoteMs / localMs,
        remoteMs,
        overheadMs: remoteMs - localMs,
        bytesPerAct: perAct,
        bytesPerTerminal: perAct / terminals,
        limits,
      })}\n`,
    );
  } finally {
    for (const c of clients) {
      c.connection.close();
      c.pair[1].destroy();
    }
  }
}
