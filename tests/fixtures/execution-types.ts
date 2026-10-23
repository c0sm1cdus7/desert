import { Type } from "@sinclair/typebox";
import { fixedProcessAdapter, openExecutionQueue } from "../../src/execution.ts";

async function typedHost() {
  const queue = await openExecutionQueue({ socketDirectory: "/private/socket", database: "fixture", user: "fixture" });
  const environment = await queue.registerEnvironment({ name: "local", label: "Local" });
  const adapter = fixedProcessAdapter({ name: "echo", executable: "/trusted/echo", arguments: [],
    workingDirectory: "/private/work", input: Type.Object({ message: Type.String() }, { additionalProperties: false }),
    timeoutMs: 5000, maxOutputBytes: 1024 });
  const actor = await queue.registerActor(environment, { name: "echo", label: "Echo", concurrency: 1, adapter });
  await queue.enqueue(actor, { key: "known", input: { message: "Hello" } });
  // @ts-expect-error Input derives from this adapter's exact schema.
  await queue.enqueue(actor, { key: "wrong", input: { message: 42 } });
  // @ts-expect-error A string cannot be used in place of an actor capability.
  await queue.enqueue("echo", { key: "wrong", input: { message: "Hello" } });
  // @ts-expect-error An actor belongs to an issued environment, not a caller-provided id.
  await queue.registerActor("local", { name: "echo", label: "Echo", concurrency: 1, adapter });
  // @ts-expect-error Fixed adapters cannot receive a dynamic shell command.
  fixedProcessAdapter({ name: "shell", executable: "/trusted/echo", arguments: [], shell: true,
    workingDirectory: "/private/work", input: Type.Object({}), timeoutMs: 5000, maxOutputBytes: 1024 });
}
void typedHost;
