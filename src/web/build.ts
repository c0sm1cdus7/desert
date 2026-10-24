import { Ajv } from "ajv";
import standaloneModule from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { compile } from "../compile.ts";
import { requireCatalog } from "../interaction/catalog.ts";
import { deriveForm } from "../interaction/form.ts";
import { compileViewProgram } from "../views/program.ts";
import { productViewProgram } from "../modules/compiled-product.ts";
import { requireFieldPresentation } from "../field-representation.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { rendererLocale } from "../messages/renderer-locale.ts";

export async function buildHumanModule(application: ReturnType<typeof compile>, surfaceId: string) {
  if (arguments.length > 2) throw new Error("VIEW_PROGRAM_OVERRIDE_FORBIDDEN");
  const surface = application.surface(surfaceId);
  if (surface.kind !== "human") throw new Error("HUMAN_SURFACE_REQUIRED");
  requireCatalog(surface.catalog);
  if (surface.language?.locale !== rendererLocale) throw new Error("UNSUPPORTED_RENDERER_LANGUAGE");
  const fieldPresentation = requireFieldPresentation(surface.fieldRepresentations, surface.fieldKinds, Object.keys(surface.language.fields));
  const viewProgram = compileViewProgram(productViewProgram(application), surface);
  viewProgramActivities(application, viewProgram, surfaceId);
  const engine = new Ajv({ strict: true, allErrors: true, ownProperties: true,
    coerceTypes: false, removeAdditional: false, useDefaults: false, code: { source: true, esm: true } });
  const exports: Record<string, string> = {};
  const commands = new Map<string, string>();
  for (const journey of surface.journeys) {
    if (journey.kind !== "mutation" || commands.has(journey.commandId)) continue;
    deriveForm(journey, fieldPresentation.fieldRepresentations);
    const name = `desertInputValidator${commands.size}`;
    engine.addSchema(journey.inputSchema, journey.commandId);
    exports[name] = journey.commandId;
    commands.set(journey.commandId, name);
  }
  const standalone = standaloneModule as unknown as (engine: Ajv, exports: Record<string, string>) => string;
  const generated = standalone(engine, exports);
  const registry = [...commands].map(([id, name]) => `${JSON.stringify(id)}: ${name}`).join(",");
  const source = `import { freezeDeep } from './src/json.ts';
    import { inspectValidation } from './src/validation-result.ts';\n${generated}\nconst validators = {${registry}};
    export const surface = freezeDeep(${JSON.stringify(surface)});
    export const viewProgram = freezeDeep(${JSON.stringify(viewProgram)});
    function inspectInput(commandId, input) {
      if (!Object.hasOwn(validators, commandId)) throw new Error('Unknown command');
      return inspectValidation(validators[commandId], input);
    }
    export const validateInput = Object.assign((commandId, input) => inspectInput(commandId, input).valid,
      { inspect: inspectInput });`;
  const result = await build({ stdin: { contents: source, resolveDir: fileURLToPath(new URL("../../", import.meta.url)) },
    bundle: true, write: false, platform: "browser", format: "esm", target: "es2022" });
  return result.outputFiles[0]!.text;
}
