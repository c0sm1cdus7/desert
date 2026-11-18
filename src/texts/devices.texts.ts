// Textos del registro, autenticación y ejecución de dispositivos.
export const deviceTexts = {
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
