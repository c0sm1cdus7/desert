import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { Duplex, PassThrough } from "node:stream";
import { expect, it, vi } from "vitest";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { identityView } from "../../house/house.ts";
import { stateHash } from "./state-hash.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
function processStream(transport: "stream" | "unix", child: Pick<ChildProcess, "stdout" | "stdin">) {
  if (transport === "unix") return undefined;
  return child.stdout && child.stdin ? Duplex.from({ readable: child.stdout, writable: child.stdin }) : undefined;
}
it("N4: unix leaves child pipes unwrapped, so cleanup cannot abort an unused duplex", () => {
  const stdout = new PassThrough();
  const stdin = new PassThrough();
  const stream = processStream("unix", { stdout, stdin });
  try {
    expect(stream).toBeUndefined();
    expect(stdout.listenerCount("readable")).toBe(0);
    expect(stdin.listenerCount("drain")).toBe(0);
  } finally {
    // Observe the old wrapper's abort when this regression is run against the broken setup.
    stream?.on("error", () => {});
    stream?.destroy();
    stdout.destroy();
    stdin.destroy();
  }
});
it.each(["stream", "unix"] as const)(
  "N4: %s, ten bursts leave an independent reader equal and all 300 payments answered",
  async transport => {
    for (let repeat = 0; repeat < 10; repeat++) {
      const f = await socketHouse(transport);
      const child = fork("tests/support/reading-terminal-process.ts", transport === "unix" ? [f.server().path] : [], {
        silent: true,
      });
      const exited = once(child, "exit");
      let output = "";
      child.stderr?.on("data", (bytes: Buffer) => {
        output += bytes.toString();
      });
      const messages: unknown[] = [];
      child.on("message", (message: unknown) => messages.push(message));
      const stream = processStream(transport, child);
      if (transport === "stream" && stream) f.attach(stream);
      const actor = fork("tests/support/burst-member-process.ts", transport === "unix" ? [f.server().path] : [], {
        silent: true,
      });
      const actorExited = once(actor, "exit");
      actor.stderr?.on("data", (bytes: Buffer) => {
        output += bytes.toString();
      });
      const actorMessages: unknown[] = [];
      actor.on("message", (message: unknown) => actorMessages.push(message));
      const actorStream = processStream(transport, actor);
      if (transport === "stream" && actorStream) f.attach(actorStream);
      try {
        await vi.waitFor(() => expect(messages).toContainEqual({ ready: true }), { timeout: 30000 });
        await vi.waitFor(() => expect(actorMessages).toContainEqual({ ready: true }), { timeout: 30000 });
        actor.send({ go: true });
        await vi.waitFor(() => expect(actorMessages).toContainEqual({ payments: 300, accepted: 300, closed: false }), {
          timeout: 70000,
        });
        const view = identityView(f.house().tools.state(), "ana");
        child.send({ through: view.through });
        await vi.waitFor(
          () =>
            expect(messages).toContainEqual({
              through: view.through,
              hash: stateHash(view),
              status: "connected",
              cut: false,
            }),
          { timeout: 30000 },
        );
        expect(output).not.toContain(socketTexts.slow);
        process.stdout.write(
          `${JSON.stringify({
            measurement: "burst",
            transport,
            repeat,
            payments: 300,
            through: view.through,
            reader: "equal",
          })}\n`,
        );
      } finally {
        if (actor.connected) actor.disconnect();
        actorStream?.destroy();
        const stopActor = setTimeout(() => actor.kill("SIGKILL"), 1000);
        await actorExited;
        clearTimeout(stopActor);
        if (child.connected) child.disconnect();
        stream?.destroy();
        const kill = setTimeout(() => child.kill("SIGKILL"), 1000);
        await exited;
        clearTimeout(kill);
        await f.close();
      }
    }
  },
  180000,
);
