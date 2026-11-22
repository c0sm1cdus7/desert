import { mkdtempSync, rmSync, writeFileSync, readFileSync, realpathSync, existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { launchHouse } from "./launch-house.ts";
function fixture(body: string) {
  const root = realpathSync(mkdtempSync("/tmp/house-launch-"));
  writeFileSync(`${root}/package.json`, JSON.stringify({ type: "module", desert: { program: "entry.mjs" } }));
  writeFileSync(
    `${root}/entry.mjs`,
    `import {writeFileSync} from 'node:fs';
    writeFileSync(${JSON.stringify(`${root}/pid`)}, String(process.pid));
    setInterval(() => {}, 1000);
    if (process.cwd() !== ${JSON.stringify(root)}) process.send({error:"Wrong program directory"});
    else { ${body} }`,
  );
  return root;
}
it("the declared executable detaches its IPC and outlives the startup call", async () => {
  const root = fixture("process.send({ready:true}); process.disconnect();");
  try {
    await launchHouse(root, root);
    const pid = Number(readFileSync(`${root}/pid`, "utf8"));
    expect(() => process.kill(pid, 0)).not.toThrow();
    process.kill(pid, "SIGTERM");
    await delay(30);
  } finally {
    cleanup(root);
  }
});
it("an unresponsive startup is stopped after five seconds", async () => {
  const root = fixture("");
  try {
    const started = performance.now();
    await expect(launchHouse(root, root)).rejects.toThrow("cinco segundos");
    expect(performance.now() - started).toBeGreaterThanOrEqual(4900);
    const pid = Number(readFileSync(`${root}/pid`, "utf8"));
    await delay(50);
    expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    cleanup(root);
  }
}, 8000);

function cleanup(root: string) {
  if (existsSync(`${root}/pid`)) {
    try {
      process.kill(Number(readFileSync(`${root}/pid`, "utf8")), "SIGTERM");
    } catch {}
  }
  rmSync(root, { recursive: true, force: true });
}
