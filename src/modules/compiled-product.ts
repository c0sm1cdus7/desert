import type { compile as compileContract } from "../compile.ts";
import type { ViewProgram } from "../views/program-schema.ts";
import type { composeProduct } from "./compose.ts";

type Application = ReturnType<typeof compileContract>;
const applications = new WeakMap<object, Application>();
const programs = new WeakMap<object, ViewProgram>();

export function registerCompiledProduct(product: object, application: Application, program: ViewProgram): void {
  applications.set(product, application);
  programs.set(application, program);
}

export function compile(product: ReturnType<typeof composeProduct>): Application {
  const application = typeof product === "object" && product !== null ? applications.get(product) : undefined;
  if (!application) throw new Error("COMPOSED_PRODUCT_REQUIRED");
  return application;
}

export function productViewProgram(application: Application): ViewProgram {
  const program = programs.get(application);
  if (!program) throw new Error("COMPOSED_PRODUCT_REQUIRED");
  return program;
}
