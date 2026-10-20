import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "../../src/index.ts";
import { openLocalController } from "../../src/local.ts";
import { requirePrivatePath, startLocalPostgres } from "../../src/local/postgres-host.ts";
import { NotesController } from "./dependencies.ts";
import { Notebook } from "./product.ts";

export async function openNotebookLocal(directory: string) {
  const postgres = startLocalPostgres(directory);
  const application = compile(Notebook);
  let controller: Awaited<ReturnType<typeof openLocalController>> | undefined;
  try {
    controller = await openLocalController(application, { ...postgres.database, role: NotesController.id });
    const identityPath = join(directory, "identity.json");
    let identity: { id: string, token: string };
    if (existsSync(identityPath)) {
      requirePrivatePath(identityPath, false);
      identity = JSON.parse(readFileSync(identityPath, "utf8"));
    } else {
      identity = await controller.identities.issue("Local owner");
      writeFileSync(identityPath, JSON.stringify(identity), { mode: 0o600, flag: "wx" });
    }
    const session = controller.connect(identity.token, "human");
    const opened = controller;
    return { application, session, async close() { await opened.close(); postgres.stop(); } };
  } catch (error) { await controller?.close(); postgres.stop(); throw error; }
}
