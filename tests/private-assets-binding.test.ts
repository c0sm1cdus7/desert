import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openPrivateAssetStore } from "../src/assets/storage.ts";
import { claimPrivateAssetStore } from "../src/assets/store-binding.ts";

test("a private directory admits exactly one host and is durably bound to one database installation", async () => {
  const directory = join(await mkdtemp(join(tmpdir(), "desert-asset-binding-")), "assets");
  const store = await openPrivateAssetStore(directory), installation = randomUUID();
  const owner = await claimPrivateAssetStore(store, installation);
  await assert.rejects(claimPrivateAssetStore(await openPrivateAssetStore(directory), installation), /ASSET_STORE_IN_USE/);
  assert.equal(await readFile(join(directory, ".installation"), "utf8"), installation);
  await owner.close();
  await assert.rejects(claimPrivateAssetStore(store, randomUUID()), /ASSET_INSTALLATION_MISMATCH/);
  const reopened = await claimPrivateAssetStore(store, installation);
  await reopened.close(); await reopened.close();
  assert.equal(await readFile(join(directory, ".installation"), "utf8"), installation);
});

test("an image worker exits when its controlling IPC connection disappears", async () => {
  const worker = fork(new URL("../src/assets/image-worker.ts", import.meta.url), [],
    { execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"] });
  try {
    const exited = once(worker, "exit");
    worker.disconnect();
    const [code] = await Promise.race([exited, new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => reject(new Error("WORKER_SURVIVED_DISCONNECT")), 5000); timeout.unref();
    })]);
    assert.notEqual(code, 0);
  } finally { if (worker.exitCode === null && worker.signalCode === null) worker.kill("SIGKILL"); }
});
