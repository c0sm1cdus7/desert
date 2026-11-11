// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
export const genericTexts = {
  optional: " · opcional",
  /** What an act with nothing to ask puts to be confirmed: what it is, and the thing it is done to. */
  sure: (act: string, thing?: string) => (thing ? `${act} · ${thing}` : act),
  offline: "Sin conexión",
  /** What a row says of an act that cannot be undone, when the act has nothing more useful to say there. */
  irreversible: "irreversible",
  /** Why a tool, or what it does, is off for who does not hold it: said as a datum, like any cause. */
  notHeld: "sin acceso",
  /** What a person may prefer not to see, and the two answers each one takes. */
  preferences: {
    name: "Preferencias",
    key: ",",
    listed: "Preferencias",
    save: "guardar",
    show: { title: "Mostrar", key: "m" },
    hide: { title: "Ocultar", key: "o" },
    shown: "visibles",
    hidden: "ocultas",
    /** What changing one answers, as any act does: what was done, to what, and how it is now. */
    now: (name: string, how: string) => `Cambiado · ${name} · ${how}`,
    off: { name: "acciones apagadas", key: "a" },
    foreign: { name: "herramientas ajenas", key: "h" },
    empty: { name: "listas vacías", key: "l" },
  },
} as const;
