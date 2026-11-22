// Explains composition failures and names the program's folders in the surface.
export const distributionTexts = {
  deviceDeclaration: "desert.device: declará carpetas locales con ejecutor, separadas de la entrada del programa.",
  testDistributionRequired: "desert.testDistribution: declará la composición local de prueba para DESERT.",
  dependencyImport: (name: string) => `desert.dependencies → ${name}`,
  failed: "No se pudo componer la distribución",
  groups: "Herramientas",
  empty: "Sin herramientas",
  reasons: {
    "distribution-dependency": "La dependencia declarada corresponde a una distribución.",
    "desert-contract": "El programa habla otra versión del contrato de DESERT.",
    "duplicate-id": "Hay dos programas con el mismo id.",
    "duplicate-fact": "El hecho está declarado más de una vez.",
    "foreign-fact": "El hecho está fuera del espacio de nombres del programa.",
    "missing-mind": "La mente pertenece a un programa que no está instalado.",
    "duplicate-mind": "La mente está habilitada más de una vez.",
    "assistants-require-identities": "Los asistentes necesitan identidades habilitadas.",
    "unsupported-reactions": "Las reacciones todavía no pasan por actos; este paso no las admite.",
    "invalid-id": "El id tiene que ser un segmento de ruta no reservado.",
  },
} as const;
