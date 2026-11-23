// Reasons shown beside a field, whether its value or one discarded key needs an explanation.
export const fieldTexts = {
  invalidCurrency: (source: string, symbol: string) => ({
    en: `Invalid currency symbol for ${source}: ${symbol}`,
    es: `Símbolo de moneda inválido para ${source}: ${symbol}`,
  }),
  countryCurrency: { en: "the country", es: "el país" },
  /** Why what is written cannot be sent yet: said where it is written, as a datum. */
  lacks: {
    missing: { en: "incomplete", es: "falta completar" },
    day: { en: "incomplete day", es: "día incompleto" },
    digits: { en: "incomplete digits", es: "dígitos incompletos" },
    characters: (count: number) => ({ en: `${count} characters`, es: `${count} caracteres` }),
    shape: { en: "invalid format", es: "formato inválido" },
    visible: { en: "text with something visible", es: "texto con algo visible" },
    least: (least: string) => ({ en: `minimum ${least}`, es: `mínimo ${least}` }),
    above: (than: string) => ({ en: `greater than ${than}`, es: `mayor a ${than}` }),
    most: (most: string) => ({ en: `maximum ${most}`, es: `máximo ${most}` }),
  },
  ignored: {
    spaces: { en: "no spaces", es: "sin espacios" },
    sign: { en: "no sign", es: "sin signo" },
    numbers: { en: "numbers only", es: "solo números" },
    character: { en: "character not allowed", es: "carácter no permitido" },
    digits: (max: number) => ({ en: `maximum ${max} digits`, es: `máximo ${max} dígitos` }),
    characters: (max: number) => ({ en: `maximum ${max} characters`, es: `máximo ${max} caracteres` }),
    decimals: (max: number) => ({ en: `maximum ${max} decimals`, es: `máximo ${max} decimales` }),
    decimal: { en: "one decimal separator, after the number", es: "un separador decimal, después del número" },
  },
  /** A day that already happened, written after today. */
  future: { en: "future day", es: "día futuro" },
} as const;
