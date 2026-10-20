import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { decimalMaskLocale } from "./decimal-mask-locale.ts";

/** Installed editing syntax, not a domain value or an alternate domain validator. */
export const InputMaskSchema = Type.Object({ kind: Type.Literal("decimal"),
  locale: Type.String({ minLength: 1 }), scale: Type.Integer({ minimum: 0, maximum: 6 }),
}, { additionalProperties: false });
export type InputMask = Frozen<Static<typeof InputMaskSchema>>;
export type MaskedValue = Readonly<{ value: string; valid: boolean; complete: boolean }>;

export function inputMask(value: unknown): InputMask {
  const snapshot = jsonSnapshot(value);
  if (!Check(InputMaskSchema, snapshot)) throw new Error("INVALID_INPUT_MASK");
  decimalMaskLocale(snapshot.locale);
  return freezeDeep(snapshot);
}

export function maskSeparators(mask: InputMask): { group: string; decimal: string } {
  const { group, decimal } = decimalMaskLocale(inputMask(mask).locale);
  return { group, decimal };
}

function lexical(value: string, scale: number): boolean {
  return value === "" || value === "-" || /^-?\d+(?:\.\d*)?$/.test(value) &&
    (value.split(".")[1]?.length ?? 0) <= scale;
}

/** Preserve writing (including zeros and a trailing decimal); never normalize or round it. */
export function formatMaskedValue(canonical: string, mask: InputMask): string {
  const checked = inputMask(mask);
  if (!lexical(canonical, checked.scale) || canonical === "") return canonical;
  const locale = decimalMaskLocale(checked.locale);
  const negative = canonical.startsWith("-");
  if (canonical === "-") return locale.minus;
  const [whole, fraction] = (negative ? canonical.slice(1) : canonical).split(".");
  return `${negative ? locale.minus : ""}${locale.groupDigits(whole!)}${fraction === undefined ? "" : locale.decimal + fraction}`;
}

/** Paste is strict; native edits may temporarily displace only known integer-group marks. */
export function readMaskedValue(display: string, mask: InputMask, strictGrouping = true): MaskedValue {
  const checked = inputMask(mask);
  const locale = decimalMaskLocale(checked.locale);
  const invalid = (): MaskedValue => ({ value: display, valid: false, complete: false });
  if (display === "") return { value: "", valid: true, complete: true };
  const negative = display.startsWith(locale.minus) || display.startsWith("-");
  const unsigned = negative ? display.slice(display.startsWith(locale.minus) ? locale.minus.length : 1) : display;
  if (negative && unsigned === "") return { value: "-", valid: true, complete: false };
  const pieces = unsigned.split(locale.decimal);
  if (pieces.length > 2) return invalid();
  const [whole, fraction] = pieces;
  const digits = whole!.split(locale.group).join("");
  if (!/^\d+$/.test(digits) || (fraction !== undefined && !/^\d*$/.test(fraction))) return invalid();
  if (strictGrouping && whole!.includes(locale.group) && locale.groupDigits(digits) !== whole) return invalid();
  const value = `${negative ? "-" : ""}${digits}${fraction === undefined ? "" : `.${fraction}`}`;
  if (!lexical(value, checked.scale)) return invalid();
  return { value, valid: true, complete: fraction !== "" };
}
