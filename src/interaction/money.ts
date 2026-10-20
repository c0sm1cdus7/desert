export function parseAmount(value: string, scale: number): string | null {
  if (value === "") return null;
  if (!Number.isInteger(scale) || scale < 0 || scale > 6 || !/^-?\d+(\.\d+)?$/.test(value)) {
    throw new Error("INVALID_MONEY_AMOUNT");
  }
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  if (fraction.length > scale) throw new Error("MONEY_PRECISION_EXCEEDED");
  const minor = BigInt(whole! + fraction.padEnd(scale, "0"));
  const result = (negative ? -minor : minor).toString();
  if (result.length > MoneyMinorUnitsLimit) throw new Error("MONEY_AMOUNT_TOO_LARGE");
  return result;
}

export function displayAmount(minorUnits: string | null, scale: number): string {
  if (minorUnits === null) return "";
  const negative = minorUnits.startsWith("-");
  const digits = minorUnits.replace(/^-/, "").padStart(scale + 1, "0");
  return `${negative ? "-" : ""}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}
export const MoneyMinorUnitsLimit = 80;

