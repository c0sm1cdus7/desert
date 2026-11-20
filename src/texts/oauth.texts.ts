// OAuth consent and host configuration words, alongside the existing door refusal catalog.
export const oauthTexts = {
  rootMismatch: "La raíz de la puerta no coincide con la raíz de esta casa de nube. Revisá el cableado al arrancar.",
  metadata: "Cliente público (método none) con authorization_code; 1 a 3 retornos de hasta 1024 bytes y nombre de 120.",
  title: "Entrar a la casa",
  enter: "Entrar",
  consent: "La invitación te da acceso a la casa con tu identidad.",
  returning: (host: string) => `Volvés a ${host}`,
  configuration: "La puerta requiere un origen público válido y una llave raíz de al menos 32 bytes.",
};
