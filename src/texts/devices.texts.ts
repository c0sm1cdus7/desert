// Texts of device registration, authentication, execution and notices.
export const deviceTexts = {
  choose: { en: "Where it runs", es: "Dónde corre" },
  house: { en: "House", es: "Casa" },
  none: { en: "No compatible devices connected", es: "No hay dispositivos conectados compatibles" },
  deviceChoice: (name: string, id: string) => `${name} (${id})`,
  confirm: (destination: string) => ({ en: `Run on ${destination}`, es: `Ejecutar en ${destination}` }),
  provisioning: {
    en: "Devices are added, accepted and retired in Identities, next to their owner",
    es: "Los dispositivos se dan de alta, se aceptan y se retiran en Identidades, junto a su titular",
  },
  completed: (reference: string) => ({
    en: `Finished · Execution · ${reference}`,
    es: `Terminada · Ejecución · ${reference}`,
  }),
  invalid: { en: "The device data is not valid.", es: "Los datos del dispositivo no son válidos." },
  forbidden: {
    en: "This identity cannot administer that device.",
    es: "Esta identidad no puede administrar ese dispositivo.",
  },
  unavailable: {
    en: "The device is not connected, accepted or available.",
    es: "El dispositivo no está conectado, aceptado o disponible.",
  },
  incompatible: {
    en: "The device does not have that action in the required version.",
    es: "El dispositivo no tiene esa acción en la versión requerida.",
  },
  destination: {
    en: "Where this action runs is a choice: house or a compatible device.",
    es: "Elegí dónde corre esta acción: casa o un dispositivo compatible.",
  },
  disconnected: {
    en: "The connection with the device was lost. The result of the execution is unknown.",
    es: "Se perdió la conexión con el dispositivo. El resultado de la ejecución no se conoce.",
  },
  retired: {
    en: "The device was retired. The result of what it was running is unknown.",
    es: "El dispositivo fue retirado. El resultado de lo que estaba ejecutando no se conoce.",
  },
  authentication: { en: "The device could not be authenticated.", es: "No se pudo autenticar el dispositivo." },
  duplicate: {
    en: "That execution was already received by the device.",
    es: "Esa ejecución ya fue recibida por el dispositivo.",
  },
  failed: {
    en: "The device returned no verifiable result. The result of the execution is unknown.",
    es: "El dispositivo no devolvió un resultado comprobable. El resultado de la ejecución no se conoce.",
  },
  closed: {
    en: "The house closed the connection. The result of the execution is unknown.",
    es: "La casa cerró la conexión. El resultado de la ejecución no se conoce.",
  },
  refusedBody: {
    en: "The house did not understand the device's request: if it is older than the device, update the house.",
    es: "La casa no entendió el pedido del dispositivo: si es más vieja que el dispositivo, actualizá la casa.",
  },
  noticeRefused: (execution: string) => ({
    en: `The house refused the notice of execution ${execution} and it is no longer sent.`,
    es: `La casa rechazó el aviso de la ejecución ${execution} y no se manda más.`,
  }),
  noticeInvalid: (tool: string, id: string) => ({
    en: `The notice of ${tool} from execution ${id} is not valid: it is not sent.`,
    es: `El aviso de ${tool} de la ejecución ${id} no es válido: no se manda.`,
  }),
  noticeTrimmed: (execution: string) => ({
    en: `The notice of execution ${execution} does not fit in a request: it goes without its value.`,
    es: `El aviso de la ejecución ${execution} no entra en un pedido: va sin su valor.`,
  }),
};
export const deviceActionTexts = {
  register: {
    name: { en: "add device", es: "agregar dispositivo" },
    enter: { en: "add", es: "agregar" },
    purpose: { en: "register a device of one's own", es: "registrar un dispositivo propio" },
    key: "j",
  },
  accept: {
    name: { en: "accept device", es: "aceptar dispositivo" },
    enter: { en: "accept", es: "aceptar" },
    purpose: { en: "enable a device of the owner", es: "habilitar un dispositivo del titular" },
    key: "f",
  },
  retire: {
    name: { en: "retire device", es: "retirar dispositivo" },
    enter: { en: "retire", es: "retirar" },
    purpose: { en: "close a device's access", es: "cerrar el acceso de un dispositivo" },
    key: "z",
  },
  id: { en: "Device identifier", es: "Identificador del dispositivo" },
  name: { en: "Device name", es: "Nombre del dispositivo" },
  publicKey: { en: "Device public key", es: "Clave pública del dispositivo" },
  hint: { en: "Device", es: "Dispositivo" },
  keyHint: { en: "Ed25519 public key in base64", es: "Clave pública Ed25519 en base64" },
  devices: { en: "Devices", es: "Dispositivos" },
  owner: { en: "only the owner registers their device", es: "solo el titular registra su dispositivo" },
  forbidden: { en: "only the owner or whoever administers", es: "solo el titular o quien administra" },
  missing: { en: "device not available to the owner", es: "dispositivo no disponible para el titular" },
  invalid: { en: "invalid public key", es: "clave pública inválida" },
  duplicate: { en: "device already registered", es: "dispositivo ya registrado" },
  registered: { en: "Added · Device", es: "Agregado · Dispositivo" },
  accepted: { en: "Accepted · Device", es: "Aceptado · Dispositivo" },
  retired: { en: "Retired · Device", es: "Retirado · Dispositivo" },
  sure: { en: "Retire the device and close its access", es: "Retirar el dispositivo y cerrar su acceso" },
  sample: { en: "Test device", es: "Dispositivo de prueba" },
};
