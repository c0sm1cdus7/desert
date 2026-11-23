// Diagnostics and explicit autonomous-fact reasons used by every repository gate.
export const catalogLawTexts = {
  action: (where: string) => ({
    en: `${where}: E-L6-ACTION · action without catalog`,
    es: `${where}: E-L6-ACTION · acción sin catálogo`,
  }),
  fact: (where: string, kind: string) => ({
    en: `${where}: E-L6-FACT · fact without a registered action · ${kind}`,
    es: `${where}: E-L6-FACT · hecho sin acción registrada · ${kind}`,
  }),
  text: (where: string, name: string) => ({
    en: `${where}: E-L6-TEXT · unused text · ${name}`,
    es: `${where}: E-L6-TEXT · texto sin uso · ${name}`,
  }),
  exported: (where: string, name: string) => ({
    en: `${where}: E-L6-EXPORT · export used only by tests · ${name}`,
    es: `${where}: E-L6-EXPORT · exportado usado sólo por pruebas · ${name}`,
  }),
  contracts: {
    en: "The composition publishes the cases of whoever asks for their contracts",
    es: "La composición publica los casos de quienes piden sus contratos",
  },
  destinationQuestion: { en: "The destination question is missing", es: "Falta la pregunta de destino" },
  caseDestination: {
    en: "The destination declared by the case is missing",
    es: "Falta el destino declarado por el caso",
  },
  destinationRow: { en: "The row of the declared destination is missing", es: "Falta la fila del destino declarado" },
};
