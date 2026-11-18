// Shares normalization between execution and simulation without running an action body.
const normalizers = new WeakMap<object, (input: unknown) => unknown>();
const simulationSafe = new WeakSet<object>();
const identityInput = new WeakSet<object>();
const prepared = new WeakSet<object>();
export function registerNormalizer(
  act: { run: object },
  normalize: (input: unknown) => unknown,
  simulation: "pure" | "unsafe" | "identity" = "unsafe",
): void {
  normalizers.set(act.run, normalize);
  simulationSafe.delete(act.run);
  identityInput.delete(act.run);
  if (simulation !== "unsafe") simulationSafe.add(act.run);
  if (simulation === "identity") identityInput.add(act.run);
}
export const normalizedInput = (act: { run: object }, input: unknown): unknown => {
  const normalize = normalizers.get(act.run);
  return normalize ? normalize(input) : input;
};
export function withPreparedInput<T>(context: object, run: () => T): T {
  prepared.add(context);
  try {
    return run();
  } finally {
    prepared.delete(context);
  }
}
export const inputPrepared = (context: object): boolean => prepared.has(context);

/** A pure declaration promises no I/O or effects; omitted secrets only support identity normalization. */
export const canSimulateInput = (act: { run: object }, omittedSecrets: boolean): boolean =>
  simulationSafe.has(act.run) && (!omittedSecrets || identityInput.has(act.run));
