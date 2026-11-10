// What the bridge to the surface says to a person, whatever the program; each program brings its own words.
export const genericTexts = {
  optional: " · opcional",
  sure: (act: string) => `${act} · confirmar`,
  offline: "Sin conexión",
} as const;
