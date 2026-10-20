import type { LocalSession } from "../local.ts";
import { requireSessionBinding } from "../local/session-binding.ts";
import { resolveBuild, webConnection } from "./plan.ts";
import { installedBuilder } from "./builders.ts";
import { digest } from "./files.ts";
import type { loadVerifiedBuild } from "./manifest.ts";

export function requireBuildSession(manifest: ReturnType<typeof loadVerifiedBuild>, session: LocalSession) {
  const { application, surface, role } = requireSessionBinding(session);
  if (application.id !== manifest.productId || application.digest !== manifest.contractDigest) {
    throw new Error("BUILD_CONTRACT_MISMATCH");
  }
  if (surface !== manifest.surfaceId) throw new Error("BUILD_SURFACE_MISMATCH");
  const resolved = resolveBuild(application, manifest.distributions, manifest.distributionId);
  const { builder, plan } = installedBuilder(resolved.plan);
  if (plan.surface !== surface || digest(plan.interaction) !== manifest.surfaceDigest) throw new Error("BUILD_SURFACE_MISMATCH");
  if (manifest.renderer.id !== builder.id || manifest.renderer.revision !== builder.revision()) {
    throw new Error("BUILD_RENDERER_MISMATCH");
  }
  const connection = webConnection(plan);
  if (connection.role !== role || digest(connection) !== digest(manifest.connection)) throw new Error("BUILD_BINDING_MISMATCH");
  return manifest;
}
