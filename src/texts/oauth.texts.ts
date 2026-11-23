// OAuth consent and host configuration words, alongside the existing door refusal catalog.
export const oauthTexts = {
  rootMismatch: {
    en: "The door's root does not match the root of this cloud house. Check the wiring at startup.",
    es: "La raíz de la puerta no coincide con la raíz de esta casa de nube. Revisá el cableado al arrancar.",
  },
  metadata: {
    en: "Public client (method none) with authorization_code; 1 to 3 redirects of up to 1024 bytes and a name of 120.",
    es: "Cliente público (método none) con authorization_code; 1 a 3 retornos de hasta 1024 bytes y nombre de 120.",
  },
  title: { en: "Enter the house", es: "Entrar a la casa" },
  enter: { en: "Enter", es: "Entrar" },
  consent: {
    en: "The invitation gives access to the house with this identity.",
    es: "La invitación te da acceso a la casa con tu identidad.",
  },
  returning: (host: string) => ({ en: `Back to ${host}`, es: `Volvés a ${host}` }),
  configuration: {
    en: "The door requires a valid public origin and a root key of at least 32 bytes.",
    es: "La puerta requiere un origen público válido y una llave raíz de al menos 32 bytes.",
  },
};
