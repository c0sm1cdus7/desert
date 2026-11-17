// Diagnósticos de llaves de nube que nombran la variable sin incluir su valor.
export const cloudTexts = {
  root: (name: string) => `La variable ${name} debe contener una llave raíz de 64 caracteres hexadecimales.`,
  door: (name: string) =>
    `La variable ${name} debe contener una llave de al menos 32 bytes en hex o base64url sin relleno.`,
  repeated: (name: string) => `La variable ${name} repite una llave de puerta.`,
};
