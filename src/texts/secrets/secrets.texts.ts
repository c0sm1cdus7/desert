export const secretTexts = {
  transaction: "La transacción ya tiene un agregado de custodia; reuní los cambios en un solo lote antes de confirmar",
  key:
    "Falta una llave válida o el llavero no respondió a tiempo; desbloquealo y reintentá. " +
    "Si copiaste la casa, trasladá sus llaves y ancla al proveedor",
  rollback:
    "Se quitaron renglones o se restauró una copia vieja; revisá la copia " +
    "y usá acceptRestoredCopy para aceptarla a propósito",
  format: "El formato experimental con una llave por casa no se convierte; usá la bóveda anterior en claro",
  forget: "Olvidar esta casa deja ilegibles sus secretos y otras copias de la misma carpeta en esta máquina",
  provider: "Falta secretKeys para las posiciones secretas del programa",
  history: (positions: string) => `Este registro necesita una revisión de secretos antes de abrirse: ${positions}`,
  protection: (file: string) => `No se puede leer la marca de protección de secretos: ${file}`,
  schema: "Esta declaración secreta no tiene una forma admitida",
};
