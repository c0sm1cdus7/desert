// Messages for opening and secret declarations that name positions without showing values
export const secretTexts = {
  transaction: {
    en: "The transaction already has a custody aggregate; gather the changes in a single batch before confirming",
    es: "La transacción ya tiene un agregado de custodia; reuní los cambios en un solo lote antes de confirmar",
  },
  key: {
    en: "The keychain is locked or did not answer; unlock it and retry",
    es: "El llavero está bloqueado o no respondió; desbloquealo y reintentá",
  },
  missingKey: {
    en: "This secret's key is missing; recover it from the keychain or from a copy of its keys",
    es: "Falta la llave de este secreto; recuperala del llavero o de una copia de sus llaves",
  },
  missingCopy: {
    en: "This copy lacks its house's keys; move its keys and its anchor to the provider",
    es: "Esta copia no tiene las llaves de su casa; trasladá sus llaves y su ancla al proveedor",
  },
  missingAnchor: {
    en: "This copy has no anchor; recover its keys and anchor or check the copy before accepting it",
    es: "Esta copia no tiene ancla; recuperá sus llaves y ancla o revisá la copia antes de aceptarla",
  },
  noBindings: { en: "none", es: "ninguno" },
  shorterLedger: {
    en: "The ledger is shorter; rows may have been removed.",
    es: "El registro es más corto; pueden haberse quitado renglones.",
  },
  differentAnchor: {
    en: "The anchor is not in this ledger; another copy may have advanced or the history changed.",
    es: "El ancla no está en este registro; otra copia pudo avanzar o la historia cambió.",
  },
  incompleteBatch: {
    en: "There is more than one aggregate or an incomplete batch after the anchor.",
    es: "Hay más de un agregado o un lote incompleto después del ancla.",
  },
  rollback: (expected: number, actual: number, reason: string, bindings: string) => ({
    en:
      `The anchor expects ${expected} rows; there are ${actual}. ${reason} ` +
      `Accepting this head accepts its bindings: ${bindings}. ` +
      "Later revocations and changes may be lost; check them before accepting.",
    es:
      `El ancla espera ${expected} renglones; hay ${actual}. ${reason} ` +
      `Al aceptar esta cabeza se aceptan sus vínculos: ${bindings}. ` +
      "Las revocaciones y cambios posteriores pueden perderse; revisalos antes de aceptar.",
  }),
  integrity: {
    en: "The ledger or the material fails the integrity check; recover a trusted copy",
    es: "El registro o el material no supera la verificación de integridad; recuperá una copia confiable",
  },
  missing: {
    en: "A binding's material is missing; recover a complete copy of the house",
    es: "Falta material de un vínculo; recuperá una copia completa de la casa",
  },
  locked: {
    en: "Another instance has this house open; close it and retry",
    es: "Otra instancia tiene abierta esta casa; cerrala y reintentá",
  },
  storage: {
    en: "The custody could not be written; disk space may be short. Free space and retry",
    es: "No se pudo escribir la custodia; puede faltar espacio en disco. Liberá espacio y reintentá",
  },
  format: {
    en: "The experimental format with one key per house is not converted; use the earlier plain vault",
    es: "El formato experimental con una llave por casa no se convierte; usá la bóveda anterior en claro",
  },
  forget: {
    en: "Forgetting this house makes its secrets and other copies of the same folder on this machine unreadable",
    es: "Olvidar esta casa deja ilegibles sus secretos y otras copias de la misma carpeta en esta máquina",
  },
  provider: {
    en: "secretKeys is missing for the program's secret positions",
    es: "Falta secretKeys para las posiciones secretas del programa",
  },
  history: (positions: string) => ({
    en: `This ledger needs a secrets review before opening: ${positions}`,
    es: `Este registro necesita una revisión de secretos antes de abrirse: ${positions}`,
  }),
  protection: (file: string) => ({
    en: `The secrets protection mark cannot be read: ${file}`,
    es: `No se puede leer la marca de protección de secretos: ${file}`,
  }),
  schema: {
    en: "This secret declaration does not have an accepted shape",
    es: "Esta declaración secreta no tiene una forma admitida",
  },
};
