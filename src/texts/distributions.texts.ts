// Explains composition failures and names the program's folders in the surface.
export const distributionTexts = {
  deviceDeclaration: {
    en: "desert.device: local folders with an executor are declared apart from the program's entry.",
    es: "desert.device: declará carpetas locales con ejecutor, separadas de la entrada del programa.",
  },
  testDistributionRequired: {
    en: "desert.testDistribution: the local test composition for DESERT is required.",
    es: "desert.testDistribution: declará la composición local de prueba para DESERT.",
  },
  dependencyImport: (name: string) => `desert.dependencies → ${name}`,
  failed: { en: "The distribution could not be composed", es: "No se pudo componer la distribución" },
  groups: { en: "Tools", es: "Herramientas" },
  empty: { en: "No tools", es: "Sin herramientas" },
  reasons: {
    "distribution-dependency": {
      en: "The declared dependency is a distribution.",
      es: "La dependencia declarada corresponde a una distribución.",
    },
    "desert-contract": {
      en: "The program speaks another version of the DESERT contract.",
      es: "El programa habla otra versión del contrato de DESERT.",
    },
    "duplicate-id": { en: "Two programs have the same id.", es: "Hay dos programas con el mismo id." },
    "duplicate-fact": {
      en: "The fact is declared more than once.",
      es: "El hecho está declarado más de una vez.",
    },
    "foreign-fact": {
      en: "The fact is outside the program's namespace.",
      es: "El hecho está fuera del espacio de nombres del programa.",
    },
    "missing-mind": {
      en: "The mind belongs to a program that is not installed.",
      es: "La mente pertenece a un programa que no está instalado.",
    },
    "duplicate-mind": { en: "The mind is enabled more than once.", es: "La mente está habilitada más de una vez." },
    "assistants-require-identities": {
      en: "Assistants need enabled identities.",
      es: "Los asistentes necesitan identidades habilitadas.",
    },
    "unsupported-reactions": {
      en: "Reactions are not yet carried by acts; this step does not accept them.",
      es: "Las reacciones todavía no pasan por actos; este paso no las admite.",
    },
    "invalid-id": {
      en: "The id has to be a path segment that is not reserved.",
      es: "El id tiene que ser un segmento de ruta no reservado.",
    },
  },
} as const;
