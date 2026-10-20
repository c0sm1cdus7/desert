import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openNotebookLocal } from "./local.ts";
import { serveBuiltLocalSurface } from "../../src/build/serve.ts";

const directory = process.argv[3] ? resolve(process.argv[3]) :
  fileURLToPath(new URL("../../.local/notebook/", import.meta.url));
const port = process.argv[4] ? Number(process.argv[4]) : 4271;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("INVALID_LOCAL_PORT");
const notebook = await openNotebookLocal(directory);
const buildDirectory = process.argv[2] ?? fileURLToPath(new URL("../../build/notebook-web", import.meta.url));
try {
  const server = await serveBuiltLocalSurface({ buildDirectory, session: notebook.session, port });
  writeFileSync(join(directory, "web-launch.json"), JSON.stringify({ url: server.launchUrl }), { mode: 0o600 });
  console.log(`Notebook is running at ${server.origin}. Open the private launch URL in ${join(directory, "web-launch.json")}.`);
  await new Promise<void>(resolve => {
    function stop() { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); resolve(); }
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  await server.close();
} finally { await notebook.close(); }
