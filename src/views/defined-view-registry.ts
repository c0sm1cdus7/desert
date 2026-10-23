const definitions = new WeakSet<object>();

export function registerDefinedView(value: object): void {
  definitions.add(value);
}

export function requireDefinedView(value: unknown): void {
  if (typeof value !== "object" || value === null || !definitions.has(value)) {
    throw new Error("VIEW_COMPONENT_AUTHORING_REQUIRED");
  }
}
