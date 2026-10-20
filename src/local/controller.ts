import { localDatabase, type LocalDatabase } from "./database.ts";
import { localProgram, type Application } from "./program.ts";
import { identityAdministration } from "./identity.ts";
import { localSession } from "./session.ts";

export async function openLocalController(application: Application, options: LocalDatabase & {
  role: string, runLifetimeMs?: number,
}) {
  const program = localProgram(application, options.role);
  const lifetime = options.runLifetimeMs ?? 5 * 60 * 1000;
  if (!Number.isSafeInteger(lifetime) || lifetime <= 0 || lifetime > 86400000) throw new Error("INVALID_RUN_LIFETIME");
  const database = localDatabase(options);
  try { await database.install(application.id, application.digest, options.role); }
  catch (error) { await database.close(); throw error; }
  return Object.freeze({
    status: "local-executor" as const,
    productId: application.id,
    contractDigest: application.digest,
    identities: identityAdministration(database),
    connect(token: string, surface: string) { return localSession(database, program, token, surface, lifetime); },
    close: database.close,
  });
}
