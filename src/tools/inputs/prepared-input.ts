// Comparte la normalización del acto con su control mecánico y evita repetirla al ejecutar el cuerpo.
const normalizers = new WeakMap<object, (input: unknown) => unknown>();
const prepared = new WeakSet<object>();
export function registerNormalizer(act: { run: object }, normalize: (input: unknown) => unknown): void {
  normalizers.set(act.run, normalize);
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
