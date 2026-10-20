import type { Database } from "./database.ts";
import { authenticate } from "./identity.ts";
import { requireInstallation, type Installation } from "./installation.ts";
import type { UnavailableReason } from "../availability-types.ts";

export function failureReason(error: unknown): UnavailableReason | "incompatible" {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") return "session-required";
  if (error instanceof Error && error.message === "INSTALLATION_MISMATCH") return "incompatible";
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.startsWith("08") || ["57P01", "57P02", "57P03", "ENOENT", "ECONNREFUSED", "ECONNRESET", "EPIPE", "ETIMEDOUT"].includes(code)) {
    return "unreachable";
  }
  return "unavailable";
}

export async function inspectLocalSession(database: Database, installation: Installation, token: string) {
  await database.transaction(async client => {
    await requireInstallation(client, installation, false);
    await authenticate(client, token, false);
  }, true);
}
