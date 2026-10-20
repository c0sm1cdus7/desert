import test from "node:test";
import assert from "node:assert/strict";
import { inputMask, formatMaskedValue, readMaskedValue, maskSeparators } from "../src/interaction/input-mask.ts";

const mask = (locale = "en-US", scale = 2) => inputMask({ kind: "decimal", locale, scale });
const valid = (value: string, complete = true) => ({ value, valid: true, complete });
const invalid = (value: string) => ({ value, valid: false, complete: false });

test("decimal mask is a closed, supported, immutable descriptor", () => {
  const checked = mask();
  assert.deepEqual(checked, { kind: "decimal", locale: "en-US", scale: 2 });
  assert.equal(Object.isFrozen(checked), true);
  for (const value of [
    { kind: "phone", locale: "en-US", scale: 2 },
    { kind: "decimal", locale: "en-US", scale: -1 },
    { kind: "decimal", locale: "en-US", scale: 7 },
    { kind: "decimal", locale: "en-US", scale: 1.5 },
    { kind: "decimal", locale: "en-US", scale: 2, pattern: "#" },
    { kind: "decimal", locale: "", scale: 2 },
    { kind: "decimal", locale: "not_a_locale", scale: 2 },
    { kind: "decimal", locale: "zz-ZZ", scale: 2 },
  ]) assert.throws(() => inputMask(value));
});

test("locale punctuation and grouping preserve exact amount and fractional writing", () => {
  const cases = [
    ["en-US", "1,234,567.20"], ["es-AR", "1.234.567,20"],
    ["de-DE", "1.234.567,20"], ["fr-FR", "1\u202f234\u202f567,20"],
    ["hi-IN", "12,34,567.20"],
  ];
  for (const [locale, expected] of cases) {
    const descriptor = mask(locale);
    assert.equal(formatMaskedValue("1234567.20", descriptor), expected);
    assert.deepEqual(readMaskedValue(expected!, descriptor), valid("1234567.20"));
    assert.equal(formatMaskedValue("-1234567.20", descriptor), `-${expected}`);
    assert.deepEqual(readMaskedValue(`-${expected}`, descriptor), valid("-1234567.20"));
  }
  assert.equal(formatMaskedValue("1000.20", mask("es-ES")), "1000,20");
  assert.equal(formatMaskedValue("10000.20", mask("es-ES")), "10.000,20");
  assert.deepEqual(maskSeparators(mask("fr-FR")), { group: "\u202f", decimal: "," });
});

test("writing states, leading zeros and negative zero round-trip without normalization", () => {
  for (const [canonical, localized] of [
    ["", ""], ["-", "-"], ["-0", "-0"], ["01.20", "01,20"],
    ["12.", "12,"], ["0001234.50", "0.001.234,50"], ["-0000.00", "-0.000,00"],
  ]) {
    assert.equal(formatMaskedValue(canonical!, mask("es-AR")), localized);
    assert.deepEqual(readMaskedValue(localized!, mask("es-AR")), valid(canonical!, canonical !== "-" && !canonical!.endsWith(".")));
  }
  assert.deepEqual(readMaskedValue("12.", mask("en-US", 0)), valid("12.", false));
});

test("arbitrarily large digits and all installed scales never round or truncate", () => {
  const huge = "9007199254740993123456789012345678901234567890";
  const grouped = "9,007,199,254,740,993,123,456,789,012,345,678,901,234,567,890";
  for (const scale of [0, 2, 3, 6]) {
    const fraction = scale ? `.${"123456".slice(0, scale)}` : "";
    assert.equal(formatMaskedValue(`${huge}${fraction}`, mask("en-US", scale)), `${grouped}${fraction}`);
    assert.deepEqual(readMaskedValue(`${grouped}${fraction}`, mask("en-US", scale)), valid(`${huge}${fraction}`));
  }
  assert.equal(formatMaskedValue("1.005", mask()), "1.005");
  assert.deepEqual(readMaskedValue("1.005", mask()), invalid("1.005"));
  assert.deepEqual(readMaskedValue("1.0", mask("en-US", 0)), invalid("1.0"));
  const beyondMoneyBound = "1".repeat(120);
  assert.deepEqual(readMaskedValue(formatMaskedValue(beyondMoneyBound, mask()), mask()), valid(beyondMoneyBound));
});

test("strict paste rejects malformed grouping and every unrecognized character without sanitizing", () => {
  for (const value of ["1,23.45", ",123.45", "1,,234.50", "1234,567.20", "1.2.3", "1.2,3",
    "1e3", "+1", "--1", " 1 ", "$1.00", "USD 1.00", "1\u00a0234.00", ".5", "１２.００"]) {
    assert.deepEqual(readMaskedValue(value, mask()), invalid(value));
  }
  assert.deepEqual(readMaskedValue("1,234,567.20", mask("hi-IN")), invalid("1,234,567.20"));
  assert.deepEqual(readMaskedValue("12,34,567.20", mask("hi-IN")), valid("1234567.20"));
  assert.deepEqual(readMaskedValue("1.234,50", mask()), invalid("1.234,50"));
  assert.deepEqual(readMaskedValue("1,234.50", mask("es-AR")), invalid("1,234.50"));
  assert.deepEqual(readMaskedValue("1234.50", mask()), valid("1234.50"));
});

test("native edit mode tolerates displaced grouping but never excess precision or stray punctuation", () => {
  assert.deepEqual(readMaskedValue("1,23.45", mask(), false), valid("123.45"));
  assert.deepEqual(readMaskedValue("1234,567.20", mask(), false), valid("1234567.20"));
  assert.deepEqual(readMaskedValue("1.23,45", mask("es-AR"), false), valid("123.45"));
  for (const value of ["1.005", "1.2,3", "1e3", "$1.00", "1.2.3"]) {
    assert.deepEqual(readMaskedValue(value, mask(), false), invalid(value));
  }
});

test("invalid canonical drafts are preserved verbatim by formatting", () => {
  for (const value of ["1e3", "+1", "--1", ".5", "1.005", "1,234.50", " 1 "]) {
    assert.equal(formatMaskedValue(value, mask("es-AR")), value);
  }
});

test("locale minus is explicit while keyboard hyphen remains usable; unsupported affixes fail closed", () => {
  const swedish = mask("sv-SE");
  assert.equal(formatMaskedValue("-1234.50", swedish), "\u22121\u00a0234,50");
  assert.deepEqual(readMaskedValue("\u22121\u00a0234,50", swedish), valid("-1234.50"));
  assert.deepEqual(readMaskedValue("-1234,50", swedish), valid("-1234.50"));
  assert.equal(formatMaskedValue("-", swedish), "\u2212");
  assert.deepEqual(readMaskedValue("\u2212", swedish), valid("-", false));
  assert.throws(() => mask("ar-EG"), /UNSUPPORTED_INPUT_MASK_LOCALE/);
});
