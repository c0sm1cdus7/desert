// Distingue piezas reservadas del core de programas que se otorgan en un kit.
export const systemTool = (id: string): boolean => id === "identities" || id === "rules";
