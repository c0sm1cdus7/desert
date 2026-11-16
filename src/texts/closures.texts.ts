export const closureTexts = {
  externalResult: "Declared external cause after execution",
  constructed: "Closed by construction: every entry fixes an incompatible answer; direct refusal verified",
  acceptedMissing: "Accepted case has no screen path",
  noEntry: (act: string) => `No row offers ${act}: unreachable action`,
  openEntry: (row: string) => `No construction proof: row ${row} leaves the case open`,
  closure: (kind: string) => `Closed by ${kind === "data" ? "an unwriteable datum" : "a declared cause"}`,
  closedAt: (kind: string, ask: string) => `Closed by ${kind} at ${ask}: the expected closure was not proved`,
  closedCause: (ask: string, cause: string) =>
    `The refusal is not visible where it is chosen: ${cause}. Closed by a declared cause at ${ask}`,
  partialReason: "an incomplete answer shows a reason",
} as const;
