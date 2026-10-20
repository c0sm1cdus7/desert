import { mkdirSync, mkdtempSync, cpSync, rmSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { resolveBuild, type Application } from "./plan.ts";
import { installedBuilder } from "./builders.ts";
import { digest, fileInventory } from "./files.ts";
import { loadVerifiedBuild, manifestFile, type BuildManifest } from "./manifest.ts";

export { loadVerifiedBuild } from "./manifest.ts";
export async function buildDistribution(application: Application, options: {
  distributions: unknown, target: string, outputDirectory: string,
}) {
  const resolved = resolveBuild(application, options.distributions, options.target);
  const { builder, plan } = installedBuilder(resolved.plan);
  const prepared = await builder.prepare(application, plan);
  const output = resolve(options.outputDirectory);
  try { lstatSync(output); throw new Error("BUILD_DESTINATION_EXISTS"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  mkdirSync(dirname(output), { recursive: true });
  const stage = mkdtempSync(join(dirname(output), ".desert-stage-"));
  const before = builder.revision();
  let ownsOutput = false;
  try {
    await prepared.build(stage);
    if (builder.revision() !== before) throw new Error("BUILDER_CHANGED_DURING_BUILD");
    const manifest: BuildManifest = {
      format: "desert.distribution-build/1", status: "built", productId: application.id,
      contractDigest: application.digest, distributionId: plan.id,
      distributionDigest: digest({ target: plan.id, distributions: resolved.definitions }),
      distributions: resolved.definitions, surfaceId: plan.surface, surfaceDigest: digest(plan.interaction),
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
