// Textos del registro, autenticación y ejecución de dispositivos.
export const deviceTexts = {
  choose: "Dónde corre",
  house: "Casa",
  none: "No hay dispositivos conectados compatibles",
  deviceChoice: (name: string, id: string) => `${name} (${id})`,
  confirm: (destination: string) => `Ejecutar en ${destination}`,
  provisioning:
    "En esta entrega, quien hospeda la casa registra y conecta los dispositivos; acá se elige dónde corre cada acción",
  completed: (reference: string) => `La ejecución terminó. Resultado: ${reference}.`,
  invalid: "Los datos del dispositivo no son válidos.",
  forbidden: "Esta identidad no puede administrar ese dispositivo.",
  unavailable: "El dispositivo no está conectado, aceptado o disponible.",
  incompatible: "El dispositivo no tiene esa acción en la versión requerida.",
  destination: "Elegí dónde corre esta acción: casa o un dispositivo compatible.",
  disconnected: "Se perdió la conexión con el dispositivo. El resultado de la ejecución no se conoce.",
  retired: "El dispositivo fue retirado. El resultado de lo que estaba ejecutando no se conoce.",
  authentication: "No se pudo autenticar el dispositivo.",
  duplicate: "Esa ejecución ya fue recibida por el dispositivo.",
  failed: "El dispositivo no devolvió un resultado comprobable. El resultado de la ejecución no se conoce.",
  closed: "La casa cerró la conexión. El resultado de la ejecución no se conoce.",
};
