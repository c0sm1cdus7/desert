// Texto único de la regla pública de identificadores y vocabulario de diagnóstico conservado.
export const identityNameTexts = {
  rule:
    "La identidad debe empezar con una letra minúscula ASCII, tener de 1 a 64 caracteres " +
    "(letras minúsculas ASCII, dígitos, puntos o guiones) y ser distinta del nombre de la casa.",
  house: "nombre reservado para la casa",
  mind: "prefijo reservado para una mente",
  trim: "nombre no está recortado",
  control: "carácter de control",
  format: "carácter de formato",
  visible: "nombre sin carácter visible",
} as const;
