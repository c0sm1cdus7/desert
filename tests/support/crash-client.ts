import { spawn } from "node:child_process";
import { Duplex } from "node:stream";
import { once } from "node:events";
export async function crashClient(home: string, mode = "") {
  const child = spawn(process.execPath, [new URL("./crash-house.ts", import.meta.url).pathname, home, mode], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  const exited = once(child, "exit");
  const stream = new Duplex({
    read() {},
    write(bytes: Buffer, _encoding, done) {
      if (child.connected) child.send({ frame: bytes.toString("base64") }, done);
      else done(new Error("Disconnected"));
    },
  });
  child.on("exit", () => stream.destroy());
  child.on("message", (message: unknown) => {
    if (message && typeof message === "object" && "frame" in message && typeof message.frame === "string")
      stream.push(Buffer.from(message.frame, "base64"));
  });
  await Promise.race([
    once(child, "message"),
    exited.then(() => {
      throw new Error("House failed before ready");
    }),
  ]);
  return {
    stream,
    exited,
    close: async () => {
      if (child.connected) child.disconnect();
      await exited;
      stream.destroy();
    },
  };
}
