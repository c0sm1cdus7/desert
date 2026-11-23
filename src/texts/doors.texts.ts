// Words in every language for invitation delivery, credential recovery and host setup.
export const doorTexts = {
  promises: {
    redeemed: "Guides the invited person to redeem on their own computer",
    missingInvitation: "Refuses a missing invitation",
    redeemAdmin: "Only whoever administers guides from the house",
    expiredInvitation: "Refuses an expired invitation",
    invited: "Issues an invitation for an existing identity",
    inviteAdmin: "Only whoever administers issues invitations",
    inviteAbsent: "Refuses invitations for whoever left the house",
    revoked: "Revokes a current key",
    revokeAdmin: "Only whoever administers revokes keys",
    unknownKey: "Refuses a key that does not exist",
  },
  invitation: {
    name: { en: "new invitation", es: "nueva invitación" },
    enter: { en: "invite", es: "invitar" },
    purpose: { en: "entry with a single-use code", es: "entrada con un código de un uso" },
    key: "v",
  },
  revoke: {
    name: { en: "revoke key", es: "revocar llave" },
    enter: { en: "revoke", es: "revocar" },
    purpose: { en: "immediate cut of a door key", es: "corte inmediato de una llave de puerta" },
    key: "x",
  },
  redeem: {
    name: { en: "guide the redemption", es: "orientar el canje" },
    enter: { en: "guide", es: "orientar" },
    purpose: { en: "issues no key and spends no invitation", es: "no emite llave ni consume invitación" },
    key: "q",
  },
  invitationId: { en: "Current invitation", es: "Invitación vigente" },
  guided: {
    en: "Informed · Redemption · the invited person redeems the code on their device; the invitation stays current.",
    es: "Informado · Canje · la persona invitada canjea el código en su equipo; la invitación sigue vigente.",
  },
  redeemed: {
    en: "Issued · Entry key · invitation spent; private delivery to the invited person.",
    es: "Emitida · Llave de entrada · invitación consumida; entrega privada a la persona invitada.",
  },
  noInvitation: { en: "no current invitation of this identity", es: "invitación no vigente de esta identidad" },
  issued: {
    en: "Issued · Invitation · expires in 24 hours · code in the private receipt",
    es: "Emitida · Invitación · vence en 24 horas · código en el recibo privado",
  },
  receipt: (code: string) => ({
    en: `Invitation: ${code} · expires in 24 hours · to share with the person who is going to enter.`,
    es: `Invitación: ${code} · vence en 24 horas · compartila con la persona que va a entrar.`,
  }),
  revoked: { en: "Revoked · Key · connections cut", es: "Revocada · Llave · conexiones cortadas" },
  absent: { en: "identity outside the house", es: "identidad fuera de la casa" },
  noKey: { en: "no current key of this identity", es: "llave no vigente de esta identidad" },
  key: { one: { en: "Door key", es: "Llave de puerta" }, many: { en: "Door keys", es: "Llaves de puerta" } },
  status: { active: { en: "current", es: "vigente" }, retired: { en: "revoked", es: "revocada" } },
  door: { en: "Origin of the invitation", es: "Origen de la invitación" },
  doors: { agent: { en: "Agent (MCP)", es: "Agente (MCP)" }, terminal: { en: "Terminal", es: "Terminal" } },
  sureRevoke: { en: "Revoke the key and cut its connections", es: "Revocar la llave y cortar sus conexiones" },
  denied: { en: "The invitation could not be redeemed.", es: "No se pudo canjear la invitación." },
  limited: {
    en: "Too many attempts. Wait a minute and try again.",
    es: "Demasiados intentos. Esperá un minuto y volvé a intentar.",
  },
  foundersIgnored: {
    en: "The founding key variables are no longer read; they can be deleted from the host.",
    es: "Las variables de llaves fundadoras ya no se leen; se pueden borrar del anfitrión.",
  },
  invalidFounders: {
    en: "The founding keys could not be registered.",
    es: "No se pudieron registrar las llaves fundadoras.",
  },
  saved: {
    en: "The key is saved. The house is open to enter now.",
    es: "La llave quedó guardada. Ya podés entrar a la casa.",
  },
  destination: {
    en:
      "The code was not sent: check owner, links and permissions of the file (0600) and of each folder from HOME " +
      "to the destination (no group or other write; 0700 recommended).",
    es:
      "No se envió el código: revisá dueño, enlaces y permisos del archivo (0600) y de cada carpeta desde HOME " +
      "hasta el destino (sin escritura de grupo ni de otros; recomendado 0700).",
  },
  outsideHome: {
    en: "The code was not sent: the key is saved only inside the personal folder (HOME).",
    es: "No se envió el código: la llave se guarda solo dentro de tu carpeta personal (HOME).",
  },
  unsafeRecovery: {
    en: "Unsafe recovery, kept. Check owner, links, size and 0600 permissions before repeating.",
    es: "Recuperación insegura, conservada. Revisá dueño, enlaces, tamaño y permisos 0600 antes de repetir.",
  },
  pending: (file: string) => ({
    en: `Candidate reserved, without confirmed issuance. Private file: ${file}.`,
    es: `Candidato reservado, sin emisión confirmada. Archivo privado: ${file}.`,
  }),
  uncertain: (file: string) => ({
    en: `Uncertain result of the pending attempt: it may have arrived. Private file: ${file}.`,
    es: `Resultado incierto del intento pendiente: pudo llegar. Archivo privado: ${file}.`,
  }),
  confirmed: (file: string) => ({
    en: `Issuance confirmed. Key in private file: ${file}.`,
    es: `Emisión confirmada. Llave en archivo privado: ${file}.`,
  }),
  resume: {
    en: "Repeat the command with the same URL, code and destination of the pending attempt to recover it.",
    es: "Repetí el comando con la misma URL, código y destino del intento pendiente para recuperarlo.",
  },
  failed: {
    en: "Uncertain result: repeat the command with the same URL, code and destination to recover the attempt.",
    es: "Resultado incierto: repetí el comando con la misma URL, código y destino para recuperar el intento.",
  },
  usage: {
    en: "Usage: redeem URL --claude FILE --name NAME, or URL --file FILE. Code through standard input.",
    es: "Uso: redeem URL --claude ARCHIVO --name NOMBRE, o URL --file ARCHIVO. Código por entrada estándar.",
  },
  secure: { en: "Use HTTPS, or localhost for a local test.", es: "Usá HTTPS, o localhost para una prueba local." },
};
