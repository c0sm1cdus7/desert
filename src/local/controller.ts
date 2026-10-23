import { localDatabase, type LocalDatabase } from "./database.ts";
import { localProgram, type Application } from "./program.ts";
import { identityAdministration } from "./identity.ts";
import { localSession } from "./session.ts";
import { requireActivityCatalog, type ActivityIndex } from "../activities/activity-index.ts";
import { humanIdentityAccess } from "../identity/access.ts";
import { rememberController } from "./controller-binding.ts";
import { privateImageHost, type PrivateImageStorage } from "../assets/host.ts";
import { requirePrivateImageMechanism } from "../assets/requirements.ts";

export async function openLocalController(application: Application, options: LocalDatabase & {
  roles: readonly string[], runLifetimeMs?: number, activities?: ActivityIndex, privateImages?: PrivateImageStorage,
}) {
  const program = localProgram(application, options.roles);
  requirePrivateImageMechanism(program, options.privateImages !== undefined);
  const activities = options.activities === undefined ? undefined : requireActivityCatalog(options.activities, application);
  const lifetime = options.runLifetimeMs ?? 5 * 60 * 1000;
  if (!Number.isSafeInteger(lifetime) || lifetime <= 0 || lifetime > 86400000) throw new Error("INVALID_RUN_LIFETIME");
  const database = localDatabase(options);
  try { await database.install(application.id, application.digest, program.roles); }
  catch (error) { await database.close(); throw error; }
  const images = await (options.privateImages ? privateImageHost(database, options.privateImages) : Promise.resolve(undefined))
    .catch(async error => { await database.close(); throw error; });
  const controller = Object.freeze({
    status: "local-executor" as const,
    productId: application.id,
    contractDigest: application.digest,
    identities: identityAdministration(database),
    access: humanIdentityAccess(database),
    connect(token: string, surface: string) { return localSession(database, program, token, surface, lifetime, activities, images); },
    async close() { try { await images?.close(); } finally { await database.close(); } },
  });
  rememberController(controller, application, program.roles, activities?.digest);
  return controller;
}
export type LocalController = Awaited<ReturnType<typeof openLocalController>>;
