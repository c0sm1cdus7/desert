// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
export const genericTexts = {
  optional: " · opcional",
  none: "Sin elegir",
  /** What an act with nothing to ask puts to be confirmed: what it is, and the thing it is done to. */
  sure: (act: string, thing?: string) => (thing ? `${act} · ${thing}` : act),
  offline: "Sin conexión",
  notHeld: "No está entre tus herramientas.",
  /** What a person may prefer not to see, and the two answers each one takes. */
  preferences: {
    name: "Preferencias",
    key: ",",
    listed: "Qué ves",
    save: "guardar",
    show: { title: "Mostrar", key: "m" },
    hide: { title: "Ocultar", key: "o" },
    shown: "Se muestran",
    hidden: "Ocultas",
    now: (name: string, how: string) => `${name} · ${how.toLowerCase()}`,
    off: { name: "Acciones apagadas", key: "a", purpose: "Las acciones que ahora no se pueden hacer." },
    foreign: { name: "Herramientas ajenas", key: "h", purpose: "Las herramientas que no están entre las tuyas." },
    empty: { name: "Listas vacías", key: "l", purpose: "Atención y Actividad mientras no tienen nada." },
  },
} as const;
