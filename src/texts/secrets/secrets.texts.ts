export const secretTexts = {
  key: "Falta una llave válida; si copiaste la casa, trasladá su llave al proveedor",
  provider: "Falta secretKeys para las posiciones secretas del programa",
  history: (positions: string) => `Este registro necesita una revisión de secretos antes de abrirse: ${positions}`,
  protection: (file: string) => `No se puede leer la marca de protección de secretos: ${file}`,
  schema: "Esta declaración secreta no tiene una forma admitida",
};
