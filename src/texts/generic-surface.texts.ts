// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
export const genericTexts = {
  optional: " · opcional",
  /** What an act with nothing to ask puts to be confirmed: what it is, and the thing it is done to. */
  sure: (act: string, thing?: string) => (thing ? `${act} · ${thing}` : act),
  offline: "Sin conexión",
  /** The last list of a thing: everything that was done to it, as the journal has it. */
  record: { title: "Registro" },
  /** Why what is written cannot be sent yet: said where it is written, as a datum. */
  lacks: {
    empty: "vacío",
    partial: "incompleto",
    least: (least: string) => `mínimo ${least}`,
    above: (than: string) => `mayor a ${than}`,
  },
  /** A day that already happened, written after today. */
  future: "día futuro",
  /** A key the field does not take, and one more than it holds. */
  notTaken: (key: string) => `«${key}» no va acá`,
  full: "no entra más",
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
