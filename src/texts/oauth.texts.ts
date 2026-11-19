// OAuth consent and host configuration words, alongside the existing door refusal catalog.
export const oauthTexts = {
  title: "Entrar a la casa",
  enter: "Entrar",
  consent: "La invitación te da acceso a la casa con tu identidad.",
  returning: (host: string) => `Volvés a ${host}`,
  configuration: "La puerta requiere un origen público válido y una llave raíz de al menos 32 bytes.",
};
