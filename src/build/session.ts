import type { LocalSession } from "../local.ts";
import { requireSessionBinding } from "../local/session-binding.ts";
import { resolveBuild, webConnection } from "./plan.ts";
import { installedBuilder } from "./builders.ts";
import { digest } from "./files.ts";
import type { loadVerifiedBuild } from "./manifest.ts";
import { requireControllerBinding } from "../local/controller-binding.ts";
import { productViewProgram } from "../modules/compiled-product.ts";

export function requireBuildSession(manifest: ReturnType<typeof loadVerifiedBuild>, session: LocalSession) {
  return requireBuildApplicationBinding(manifest, requireSessionBinding(session));
}
export function requireBuildController(manifest: ReturnType<typeof loadVerifiedBuild>, controller: object, surface: string) {
  return requireBuildApplicationBinding(manifest, { ...requireControllerBinding(controller), surface });
}
function requireBuildApplicationBinding(manifest: ReturnType<typeof loadVerifiedBuild>,
  { application, surface, roles, activitiesDigest }: Pick<ReturnType<typeof requireSessionBinding>, "application" | "surface" | "roles" | "activitiesDigest">) {
  if (application.id !== manifest.productId || application.digest !== manifest.contractDigest) {
    throw new Error("BUILD_CONTRACT_MISMATCH");
  }
  if (surface !== manifest.surfaceId) throw new Error("BUILD_SURFACE_MISMATCH");
  if (digest(productViewProgram(application)) !== manifest.viewProgramDigest) throw new Error("BUILD_VIEW_PROGRAM_MISMATCH");
  if (activitiesDigest !== manifest.activitiesDigest) throw new Error("BUILD_ACTIVITY_CATALOG_MISMATCH");
  const resolved = resolveBuild(application, manifest.distributions, manifest.distributionId);
  const { builder, plan } = installedBuilder(resolved.plan);
  if (plan.surface !== surface || digest(plan.interaction) !== manifest.surfaceDigest) throw new Error("BUILD_SURFACE_MISMATCH");
  if (manifest.renderer.id !== builder.id || manifest.renderer.revision !== builder.revision()) {
    throw new Error("BUILD_RENDERER_MISMATCH");
  }
  const connection = webConnection(plan);
  if (connection.roles.some(role => !roles.includes(role)) || digest(connection) !== digest(manifest.connection)) {
    throw new Error("BUILD_BINDING_MISMATCH");
  }
  return manifest;
}
