import { createHash } from "node:crypto";
import { ProductDefinitionSchema, type ProductDefinition } from "./contracts.ts";
import { freezeDeep, jsonSnapshot } from "./json.ts";
import { emitObject } from "./schema.ts";
import { createSchemaValidator, createShapeValidator } from "./validation.ts";
import { compileProgram } from "./compile-program.ts";
import { projectSurface } from "./project-surface.ts";
import { requireReference } from "./references.ts";
import { planDistributions } from "./plan-distributions.ts";
import { rememberDefinition } from "./compiled-definition.ts";

const validateDefinition = createSchemaValidator<ProductDefinition>(ProductDefinitionSchema);

export function compile(definition: unknown) {
  const snapshot = jsonSnapshot(definition);
  if (!validateDefinition(snapshot)) throw new Error("Invalid definition: unsupported or malformed contract");
  const objects = new Map(snapshot.objects.map(object => [object.id, object]));
  if (objects.size !== snapshot.objects.length) throw new Error("Invalid definition: duplicate object identity");
  const compiled = new Map([...objects].map(([id, object]) => {
    const schema = freezeDeep(emitObject(object));
    return [id, { schema, validate: createShapeValidator(schema) }] as const;
  }));
  const program = compileProgram(snapshot);
  const inputs = new Map([...program.commands].map(([id, command]) => {
    const schema = freezeDeep(command.inputSchema);
    return [id, { schema, validate: createShapeValidator(schema) }] as const;
  }));
  const digest = createHash("sha256")
    .update(JSON.stringify({ format: snapshot.journeys ? "desert.contract/3" : "desert.shape/1", definition: snapshot }))
    .digest("hex");
  const description = freezeDeep({
    protocol: "desert.shapes/1" as const,
    productId: snapshot.id,
    contractDigest: digest,
    objects: Object.fromEntries([...compiled].map(([id, object]) => [id, object.schema])),
  });
  const surfaces = new Map([...program.surfaces].map(([id, surface]) => [id, projectSurface(snapshot, program, surface, digest)]));
  const executionPlan = freezeDeep({ status: "not-installed" as const,
    policies: snapshot.policies ?? [], journeys: snapshot.journeys ?? [], dependencies: snapshot.dependencies ?? [] });

  function resolve(id: string) {
    const object = compiled.get(id);
    if (!object) throw new Error(`Unknown object: ${id}`);
    return object;
  }

  const application = Object.freeze({
    id: snapshot.id,
    digest,
    objectIds: Object.freeze([...objects.keys()]),
    describe() { return description; },
    executionPlan() { return executionPlan; },
    planDistributions(definitions: unknown) { return planDistributions(snapshot.id, digest, surfaces, program.dependencies, definitions); },
    surface(id: string) { return requireReference(surfaces, id, "surface"); },
    inputSchema(id: string) { return requireReference(inputs, id, "command").schema; },
    validateInput(id: string, value: unknown) { return requireReference(inputs, id, "command").validate(value); },
    schema(id: string) { return resolve(id).schema; },
    validate(id: string, value: unknown) {
      return resolve(id).validate(value);
    },
  });
  rememberDefinition(application, snapshot);
  return application;
}
