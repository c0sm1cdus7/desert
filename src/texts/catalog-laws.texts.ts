// Diagnostics and explicit autonomous-fact reasons used by every repository gate.
export const catalogLawTexts = {
  action: (where: string) => `${where}: E-L6-ACTION · acción sin catálogo`,
  fact: (where: string, kind: string) => `${where}: E-L6-FACT · hecho sin acción registrada · ${kind}`,
  text: (where: string, name: string) => `${where}: E-L6-TEXT · texto sin uso · ${name}`,
  exported: (where: string, name: string) => `${where}: E-L6-EXPORT · exportado usado sólo por pruebas · ${name}`,
  contracts: "La composición publica los casos de quienes piden sus contratos",
  destinationQuestion: "Falta la pregunta de destino",
  caseDestination: "Falta el destino declarado por el caso",
  destinationRow: "Falta la fila del destino declarado",
};
