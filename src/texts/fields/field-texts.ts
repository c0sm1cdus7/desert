// Reasons shown beside a field, whether its value or one discarded key needs an explanation.
export const fieldTexts = {
  /** Why what is written cannot be sent yet: said where it is written, as a datum. */
  lacks: {
    missing: "falta completar",
    day: "día incompleto",
    digits: "dígitos incompletos",
    characters: (count: number) => `${count} caracteres`,
    shape: "formato inválido",
    least: (least: string) => `mínimo ${least}`,
    above: (than: string) => `mayor a ${than}`,
    most: (most: string) => `máximo ${most}`,
  },
  ignored: {
    spaces: "sin espacios",
    sign: "sin signo",
    numbers: "solo números",
    character: "carácter no permitido",
    digits: (max: number) => `máximo ${max} dígitos`,
    characters: (max: number) => `máximo ${max} caracteres`,
    decimals: (max: number) => `máximo ${max} decimales`,
    decimal: "un separador decimal, después del número",
  },
  /** A day that already happened, written after today. */
  future: "día futuro",
} as const;
