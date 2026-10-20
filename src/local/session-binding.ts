import type { Application } from "./program.ts";

type Binding = { application: Application, surface: string, role: string };
const bindings = new WeakMap<object, Readonly<Binding>>();

export function rememberSession(session: object, binding: Binding) {
  bindings.set(session, Object.freeze(binding));
}

export function requireSessionBinding(session: object) {
  const binding = bindings.get(session);
  if (!binding) throw new Error("UNTRUSTED_LOCAL_SESSION");
  return binding;
}
