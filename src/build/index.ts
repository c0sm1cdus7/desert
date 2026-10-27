import { mkdirSync, mkdtempSync, cpSync, rmSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { resolveBuild, type Application } from "./plan.ts";
import { installedBuilder } from "./builders.ts";
import { digest, fileInventory } from "./files.ts";
import { buildFormat, loadVerifiedBuild, manifestFile, type BuildManifest } from "./manifest.ts";
import { bindLocalMedia, writeLocalMedia, requireDistinctMedia, type LocalMediaBinding } from "./media.ts";
import { prepareRenditions } from "./public-catalog/renditions.ts";
import { compileViewProgram } from "../views/program.ts";
import { requireViewMediaBindings } from "./media-references.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { productViewProgram } from "../modules/compiled-product.ts";

export { loadVerifiedBuild } from "./manifest.ts";
export type { LocalMediaBinding } from "./media.ts";
export async function buildDistribution(application: Application, options: {
  distributions: unknown, target: string, outputDirectory: string,
  media?: LocalMediaBinding,
}) {
  if (Object.hasOwn(options, "viewProgram")) throw new Error("VIEW_PROGRAM_OVERRIDE_FORBIDDEN");
  const resolved = resolveBuild(application, options.distributions, options.target);
  const { builder, plan } = installedBuilder(resolved.plan);
  const viewProgram = compileViewProgram(productViewProgram(application), plan.interaction);
  const activities = viewProgramActivities(application, viewProgram, plan.surface);
  const media = options.media ? bindLocalMedia(options.media) : undefined;
  requireViewMediaBindings(viewProgram, media ?? []);
  const prepared = await builder.prepare(application, plan);
  if (media) await prepareRenditions(media);
  const output = resolve(options.outputDirectory);
  try { lstatSync(output); throw new Error("BUILD_DESTINATION_EXISTS"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  mkdirSync(dirname(output), { recursive: true });
  const stage = mkdtempSync(join(dirname(output), ".desert-stage-"));
  const before = builder.revision();
  let ownsOutput = false;
  try {
    const { gate } = await prepared.build(stage);
    if (media) { requireDistinctMedia(media, fileInventory(stage)); writeLocalMedia(stage, media); }
    if (builder.revision() !== before) throw new Error("BUILDER_CHANGED_DURING_BUILD");
    const manifest: BuildManifest = {
      format: buildFormat, status: "built", gate, productId: application.id,
      contractDigest: application.digest, distributionId: plan.id,
      distributionDigest: digest({ target: plan.id, distributions: resolved.definitions }),
      distributions: resolved.definitions, surfaceId: plan.surface, surfaceDigest: digest(plan.interaction),
      viewProgramDigest: digest(viewProgram),
      ...(activities ? { activitiesDigest: activities.digest } : {}),
      renderer: { id: builder.id, revision: before }, connection: prepared.connection,
      files: fileInventory(stage),
    };
    writeFileSync(join(stage, manifestFile), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    loadVerifiedBuild(stage);
    mkdirSync(output);
    ownsOutput = true;
    cpSync(stage, output, { recursive: true, errorOnExist: true, force: false });
    return loadVerifiedBuild(output);
  } catch (error) {
    if (ownsOutput) rmSync(output, { recursive: true });
    throw error;
  } finally { rmSync(stage, { recursive: true }); }
}
