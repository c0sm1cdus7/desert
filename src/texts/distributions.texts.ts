// Explains composition failures and names the program's folders in the surface.
export const distributionTexts = {
  failed: "No se pudo componer la distribución",
  groups: "Herramientas",
  empty: "Sin herramientas",
  reasons: {
    "contrato-desert": "El programa habla otra versión del contrato de DESERT.",
    "id-repetido": "Hay dos programas con el mismo id.",
    "hecho-repetido": "El hecho está declarado más de una vez.",
    "hecho-ajeno": "El hecho está fuera del espacio de nombres del programa.",
    "mente-ausente": "La mente pertenece a un programa que no está instalado.",
    "mente-repetida": "La mente está habilitada más de una vez.",
    "asistentes-requiere-identidades": "Los asistentes necesitan identidades habilitadas.",
    "reacciones-no-soportadas": "Las reacciones todavía no pasan por actos; este paso no las admite.",
    "id-invalido": "El id tiene que ser un segmento de ruta no reservado.",
  },
} as const;
