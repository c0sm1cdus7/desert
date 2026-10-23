import { spawn } from "node:child_process";
import { renewClaim, type Claim } from "./claims.ts";
import type { QueueContext } from "./context.ts";
import type { ExecutionResult, ProcessAdapterDefinition } from "./types.ts";
import type { TSchema } from "@sinclair/typebox";

type Outcome = { state: "succeeded" | "failed" | "uncertain"; reason: string | null; result: ExecutionResult };

function boundedText(buffer: Buffer, budget: number) {
  let text = buffer.toString("utf8");
  while (Buffer.byteLength(text) > budget) text = text.slice(0, -1);
  return text;
}

export function executeFixedProcess(context: QueueContext, claim: Claim, adapter: ProcessAdapterDefinition<TSchema>): Promise<Outcome> {
  return new Promise(resolve => {
    let started = false, settled = false, spawnFailed = false;
    let reason: string | null = null;
    let outputBytes = 0;
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(adapter.executable, [...adapter.arguments], {
      cwd: adapter.workingDirectory, env: {}, shell: false, windowsHide: true, stdio: "pipe",
    });
    function terminate(cause: string) {
      if (settled || reason) return;
      reason = cause;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => { if (!settled) child.kill("SIGKILL"); }, 250);
    }
    function capture(target: Buffer[], chunk: Buffer) {
      const remaining = Math.max(0, adapter.maxOutputBytes - outputBytes);
      const retained = chunk.subarray(0, remaining);
      if (retained.length) target.push(Buffer.from(retained));
      outputBytes += retained.length;
      if (chunk.length > remaining) terminate("output-limit");
    }
    async function pulse() {
      if (settled) return;
      try { if (await renewClaim(context, claim)) terminate("cancelled-after-start"); }
      catch { terminate("worker-ownership-unconfirmed"); }
      if (!settled) pulseTimer = setTimeout(pulse, Math.min(250, context.leaseMs / 4));
    }
    const timeout = setTimeout(() => terminate("runtime-limit"), adapter.timeoutMs);
    child.once("spawn", () => { started = true; });
    child.once("error", () => { spawnFailed = true; });
    child.stdin.on("error", () => {});
    child.stdout.on("data", (chunk: Buffer) => capture(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => capture(stderr, chunk));
    child.once("close", (exitCode, signal) => {
      settled = true;
      clearTimeout(timeout); clearTimeout(pulseTimer); clearTimeout(killTimer);
      const out = boundedText(Buffer.concat(stdout), adapter.maxOutputBytes);
      const err = boundedText(Buffer.concat(stderr), adapter.maxOutputBytes - Buffer.byteLength(out));
      const result = Object.freeze({ exitCode, signal, stdout: out, stderr: err });
      if (!started && spawnFailed) resolve({ state: "failed", reason: "process-not-started", result });
      else if (reason || signal || spawnFailed) resolve({ state: "uncertain", reason: reason ?? "process-interrupted", result });
      else resolve({ state: exitCode === 0 ? "succeeded" : "failed", reason: exitCode === 0 ? null : "nonzero-exit", result });
    });
    child.stdin.end(JSON.stringify({ operationId: claim.id, input: claim.input }));
    pulseTimer = setTimeout(pulse, Math.min(250, context.leaseMs / 4));
  });
}
