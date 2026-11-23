// Diagnostics for cloud keys that name the variable without including its value.
export const cloudTexts = {
  root: (name: string) => ({
    en: `The variable ${name} needs to hold a root key of 64 hexadecimal characters.`,
    es: `La variable ${name} debe contener una llave raíz de 64 caracteres hexadecimales.`,
  }),
  door: (name: string) => ({
    en: `The variable ${name} needs to hold a key of at least 32 bytes in hex or unpadded base64url.`,
    es: `La variable ${name} debe contener una llave de al menos 32 bytes en hex o base64url sin relleno.`,
  }),
  repeated: (name: string) => ({
    en: `The variable ${name} repeats a door key.`,
    es: `La variable ${name} repite una llave de puerta.`,
  }),
};
