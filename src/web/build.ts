import { Ajv } from "ajv";
import standaloneModule from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { compile } from "../compile.ts";
import { requireCatalog } from "../interaction/catalog.ts";
import { deriveForm } from "../interaction/form.ts";

export async function buildHumanModule(application: ReturnType<typeof compile>, surfaceId: string) {
  const surface = application.surface(surfaceId);
  if (surface.kind !== "human") throw new Error("HUMAN_SURFACE_REQUIRED");
  requireCatalog(surface.catalog);
  if (surface.language?.locale !== "en") throw new Error("UNSUPPORTED_RENDERER_LANGUAGE");
  const entry = surface.journeys.find(journey => journey.id === surface.navigation?.entry);
  if (entry?.kind !== "read") throw new Error("UNSUPPORTED_RENDERER_ENTRY");
  const navigation = new Set([surface.navigation!.entry, surface.navigation!.primaryAction, ...surface.navigation!.subjectActions]);
  for (const journey of surface.journeys) {
    if (!navigation.has(journey.id) || (journey.kind === "mutation" &&
        (journey.object !== entry.subject || (journey.subject && journey.inputFields.length)))) {
      throw new Error("UNSUPPORTED_RENDERER_COMPOSITION");
    }
  }
  const engine = new Ajv({ strict: true, allErrors: true, ownProperties: true,
    coerceTypes: false, removeAdditional: false, useDefaults: false, code: { source: true, esm: true } });
  const exports: Record<string, string> = {};
  const commands = new Map<string, string>();
  for (const journey of surface.journeys) {
    if (journey.kind !== "mutation" || commands.has(journey.commandId)) continue;
    deriveForm(journey, surface.inputs ?? {});
    const name = `validate${commands.size}`;
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
