// Safe opening diagnostics name declarations and positions, never their values.
export const secretTexts = {
  history: (positions: string) => `Este registro necesita una revisión de secretos antes de abrirse: ${positions}`,
  schema: "Esta declaración secreta no tiene una forma admitida",
};
