// Texts for the local server's entry, incompatible versions, requests and shutdown.
export const socketTexts = {
  interrupted: {
    en: "Cut off before the answer: Activity shows whether it was done.",
    es: "Se cortó antes de la respuesta: fijate en Actividad si se hizo.",
  },
  startFailed: { en: "The house could not open.", es: "No se pudo abrir la casa." },
  startTimeout: { en: "The house did not answer in five seconds.", es: "La casa no respondió en cinco segundos." },
  home: {
    en: "The open writer belongs to another house folder.",
    es: "El escritor abierto pertenece a otra carpeta de casa.",
  },
  denied: { en: "The key gives no entry to this house.", es: "La llave no da entrada a esta casa." },
  removed: { en: "This identity is no longer in this house.", es: "Ya no estás en esta casa." },
  admin: { en: "Only whoever administers can shut the house down.", es: "Solo quien administra puede apagar la casa." },
  unavailable: {
    en: "This door does not attend that request yet.",
    es: "Esta puerta todavía no atiende ese pedido.",
  },
  reused: {
    en: "That request identifier was already used with other content.",
    es: "Ese identificador de pedido ya se usó con otro contenido.",
  },
  unknown: { en: "There is no request with that identifier.", es: "No hay un pedido con ese identificador." },
  closing: { en: "The house is closing.", es: "La casa se está cerrando." },
  failed: {
    en: "The house could not complete the request. Check the same identifier before acting again.",
    es: "La casa no pudo completar el pedido. Consultá el mismo identificador antes de volver a actuar.",
  },
  version: (house: number, client: number) => ({
    en: `The house uses protocol ${house} and the client ${client}.`,
    es: `La casa usa el protocolo ${house} y el cliente ${client}.`,
  }),
  node: (house: string, client: string) => ({
    en: `The house uses Node ${house} and the client ${client}.`,
    es: `La casa usa Node ${house} y el cliente ${client}.`,
  }),
  path: (path: string) => ({
    en: `The socket path does not fit within the macOS limit: ${path}`,
    es: `La ruta del socket no entra en el límite de macOS: ${path}`,
  }),
  pending: (count: number) => ({
    en: `House closed. Acts left in progress: ${count}.`,
    es: `Casa cerrada. Actos que quedaron en curso: ${count}.`,
  }),
  beforeState: {
    en: "The connection was cut before the house state arrived.",
    es: "Se cortó la conexión antes de recibir el estado de la casa.",
  },
  stateMismatch: {
    en: "The state received does not match the house. It is being asked for again.",
    es: "El estado recibido no coincide con la casa. Se está pidiendo de nuevo.",
  },
  stateUnverified: {
    en: "The house state could not be checked. The terminal was closed. Open it again.",
    es: "No se pudo comprobar el estado de la casa. Se cerró la terminal. Volvé a abrirla.",
  },
  invalidData: {
    en: "The request has invalid data. Nothing was written.",
    es: "El pedido tiene datos inválidos. No se escribió nada.",
  },
  stateFailed: {
    en: "The house state could not be sent. Open the terminal again.",
    es: "No se pudo enviar el estado de la casa. Volvé a abrir la terminal.",
  },
  slow: {
    en: "The terminal stopped receiving the state. Its connection was closed.",
    es: "La terminal dejó de recibir el estado. Se cerró su conexión.",
  },
  bodyTimeout: {
    en: "The complete frame did not arrive in time.",
    es: "No llegó el marco completo dentro del plazo.",
  },
  busy: {
    en: "Too many connections are waiting to enter the house.",
    es: "Hay demasiadas conexiones esperando entrar a la casa.",
  },
  quota: {
    en: "This connection reached its request cap. Wait a second and try again.",
    es: "Llegaste al tope de pedidos de esta conexión. Esperá un segundo y volvé a intentar.",
  },
  outputLimit: {
    en: "The output reached its cap. The most recent stretch is kept.",
    es: "Se alcanzó el tope de la salida. Se conserva el tramo más reciente.",
  },
  startCause: (code: string) => ({
    en: `The house could not open. Cause: ${code}.`,
    es: `No se pudo abrir la casa. Causa: ${code}.`,
  }),
  remoteAddress: {
    en: "Only an HTTPS URL without credentials or parameters, or localhost for a local test.",
    es: "Usá una URL HTTPS sin credenciales ni parámetros, o localhost para una prueba local.",
  },
  configMissing: {
    en: "The MCP server is missing from the project or user configuration.",
    es: "Falta el servidor MCP en la configuración del proyecto o del usuario.",
  },
  configInvalid: {
    en: "The MCP configuration could not be read: check its format and permissions.",
    es: "No se pudo leer la configuración MCP: revisá su formato y permisos.",
  },
  configUrl: { en: "The MCP server is missing a valid URL.", es: "Falta una URL válida en el servidor MCP." },
  configKey: {
    en: "The MCP server is missing Authorization: Bearer with the key.",
    es: "Falta Authorization: Bearer con la llave en el servidor MCP.",
  },
  frame: { en: "Invalid or too large frame.", es: "Marco inválido o demasiado grande." },
};
