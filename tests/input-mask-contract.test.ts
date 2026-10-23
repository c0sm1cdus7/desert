import test from "node:test";
import assert from "node:assert/strict";
import { resolvedNode } from "../src/interaction/resolved-node.ts";
import { parseAmount, MoneyMinorUnitsLimit } from "../src/interaction/money.ts";

const input = { version: "desert.bank-node/1", kind: "input.text", name: "quantity", label: "Quantity",
  value: "1234.50", required: false, disabled: false };
const mask = { kind: "decimal", locale: "en-US", scale: 2 };

test("only single-line bank inputs accept the closed installed mask", () => {
  const node = resolvedNode({ ...input, mask });
  assert.equal(node.kind, "input.text");
  assert.deepEqual(node.kind === "input.text" && node.mask, mask);
  for (const rejected of [
    { ...input, mask: { ...mask, locale: "zz-ZZ" } },
    { ...input, mask: { ...mask, locale: "invalid_locale" } },
    { ...input, mask: { ...mask, kind: "phone" } },
    { ...input, mask: { ...mask, rounding: "nearest" } },
    { ...input, kind: "input.multiline", mask },
  ]) assert.throws(() => resolvedNode(rejected));
  assert.equal(resolvedNode({ ...input, kind: "input.multiline" }).kind, "input.multiline");
});

test("money canonical length boundary counts sign and padded fraction without rounding", () => {
  assert.equal(MoneyMinorUnitsLimit, 80);
  assert.equal(parseAmount("9".repeat(80), 0), "9".repeat(80));
  assert.equal(parseAmount(`-${"9".repeat(79)}`, 0), `-${"9".repeat(79)}`);
  assert.equal(parseAmount(`${"9".repeat(78)}.99`, 2), "9".repeat(80));
  assert.equal(parseAmount(`${"0".repeat(120)}1.00`, 2), "100");
  for (const [value, scale] of [["9".repeat(81), 0], [`-${"9".repeat(80)}`, 0],
    [`${"9".repeat(79)}.99`, 2], ["9".repeat(79), 2]] as const) {
    assert.throws(() => parseAmount(value, scale), /MONEY_AMOUNT_TOO_LARGE/);
  }
});
