import type { Application } from "./program.ts";

const bindings = new WeakMap<object, Readonly<{ application: Application; roles: readonly string[]; activitiesDigest?: string }>>();
export function rememberController(controller: object, application: Application, roles: readonly string[], activitiesDigest?: string) {
  bindings.set(controller, Object.freeze({ application, roles, ...(activitiesDigest ? { activitiesDigest } : {}) }));
}
export function requireControllerBinding(controller: object) {
  const binding = bindings.get(controller);
  if (!binding) throw new Error("UNTRUSTED_LOCAL_CONTROLLER");
  return binding;
}
