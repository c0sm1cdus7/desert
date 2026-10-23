type Property = readonly [PropertyKey, unknown, boolean];
type Declaration = { value: object; prototype: object | null; properties: readonly Property[] };
type Registration = { handle: object; declarations: readonly Declaration[] };
const registrations = new WeakMap<object, Registration>();

function declarationGraph(source: object): readonly Declaration[] {
  const visited = new Set<object>();
  const declarations: Declaration[] = [];
  function visit(value: object) {
    if (visited.has(value)) return;
    visited.add(value);
    const properties: Property[] = Reflect.ownKeys(value).map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor)) throw new Error("INVALID_DECLARATION_DATA");
      return [key, descriptor.value, descriptor.enumerable === true];
    });
    declarations.push({ value, prototype: Object.getPrototypeOf(value), properties });
    for (const [, child] of properties) if (typeof child === "object" && child !== null) visit(child);
  }
  visit(source);
  return declarations;
}

export function registeredModuleSource(source: object): object | undefined {
  const registered = registrations.get(source);
  if (!registered) return;
  for (const { value, prototype, properties } of registered.declarations) {
    if (Object.getPrototypeOf(value) !== prototype) throw new Error("MUTATED_MODULE_DEFINITION");
    const keys = Reflect.ownKeys(value);
    if (keys.length !== properties.length) throw new Error("MUTATED_MODULE_DEFINITION");
    for (const [index, [key, original, enumerable]] of properties.entries()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (keys[index] !== key || !descriptor || !("value" in descriptor)
        || !Object.is(descriptor.value, original) || descriptor.enumerable !== enumerable) {
        throw new Error("MUTATED_MODULE_DEFINITION");
      }
    }
  }
  return registered.handle;
}

export function rememberModuleSource(source: object, handle: object): void {
  registrations.set(source, { handle, declarations: declarationGraph(source) });
}
