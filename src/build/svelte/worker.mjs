import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const mode = process.argv[2];
if (mode === "check") {
  execFileSync(process.execPath, [resolve(root, "node_modules/@sveltejs/kit/svelte-kit.js"), "sync"], { stdio: "inherit" });
  execFileSync(process.execPath, [resolve(root, "node_modules/svelte-check/bin/svelte-check"), "--tsconfig", "./tsconfig.json"], { stdio: "inherit" });
} else if (mode === "build") {
  execFileSync(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "build"], { stdio: "inherit" });
} else throw new Error("UNKNOWN_BUILD_WORKER_MODE");
