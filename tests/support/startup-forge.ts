// Cross the runtime boundary as an untyped program would; the separate type law checks typed callers.
export function emitUnchecked(bus: object, entry: unknown): void {
  const emit: unknown = Reflect.get(bus, "emit");
  if (typeof emit !== "function") throw new Error("Missing emit");
  Reflect.apply(emit, bus, [entry]);
}
