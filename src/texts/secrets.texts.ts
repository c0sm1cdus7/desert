// Messages for opening and secret declarations that name positions without showing values
export const secretTexts = {
  transaction: "La transacción ya tiene un agregado de custodia; reuní los cambios en un solo lote antes de confirmar",
  key: "El llavero está bloqueado o no respondió; desbloquealo y reintentá",
  missingKey: "Falta la llave de este secreto; recuperala del llavero o de una copia de sus llaves",
  missingCopy: "Esta copia no tiene las llaves de su casa; trasladá sus llaves y su ancla al proveedor",
  missingAnchor: "Esta copia no tiene ancla; recuperá sus llaves y ancla o revisá la copia antes de aceptarla",
  noBindings: "ninguno",
  shorterLedger: "El registro es más corto; pueden haberse quitado renglones.",
  differentAnchor: "El ancla no está en este registro; otra copia pudo avanzar o la historia cambió.",
  incompleteBatch: "Hay más de un agregado o un lote incompleto después del ancla.",
  rollback: (expected: number, actual: number, reason: string, bindings: string) =>
    `El ancla espera ${expected} renglones; hay ${actual}. ${reason} ` +
    `Al aceptar esta cabeza se aceptan sus vínculos: ${bindings}. ` +
    "Las revocaciones y cambios posteriores pueden perderse; revisalos antes de aceptar.",
  integrity: "El registro o el material no supera la verificación de integridad; recuperá una copia confiable",
  missing: "Falta material de un vínculo; recuperá una copia completa de la casa",
  locked: "Otra instancia tiene abierta esta casa; cerrala y reintentá",
  storage: "No se pudo escribir la custodia; puede faltar espacio en disco. Liberá espacio y reintentá",
  format: "El formato experimental con una llave por casa no se convierte; usá la bóveda anterior en claro",
  forget: "Olvidar esta casa deja ilegibles sus secretos y otras copias de la misma carpeta en esta máquina",
  provider: "Falta secretKeys para las posiciones secretas del programa",
  history: (positions: string) => `Este registro necesita una revisión de secretos antes de abrirse: ${positions}`,
  protection: (file: string) => `No se puede leer la marca de protección de secretos: ${file}`,
  schema: "Esta declaración secreta no tiene una forma admitida",
};
