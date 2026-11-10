// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
export const genericTexts = {
  optional: " · opcional",
  sure: (act: string) => `${act} · confirmar`,
  offline: "Sin conexión",
  notHeld: "No está entre tus herramientas.",
  /** What a person may prefer not to see, and the two answers each one takes. */
  preferences: {
    name: "Preferencias",
    key: ",",
    listed: "Qué ves",
    show: { title: "Mostrar", key: "m" },
    hide: { title: "Ocultar", key: "o" },
    shown: "Se muestran",
    hidden: "Ocultas",
    now: (name: string, how: string) => `${name} · ${how.toLowerCase()}`,
    off: { name: "Acciones apagadas", key: "a", purpose: "Las acciones que ahora no se pueden hacer." },
    foreign: { name: "Herramientas ajenas", key: "h", purpose: "Las herramientas que no están entre las tuyas." },
  },
} as const;
