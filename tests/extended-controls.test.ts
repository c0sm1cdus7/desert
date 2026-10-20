import test from "node:test";
import assert from "node:assert/strict";
import { controlNode, applyControlEvent } from "../src/interaction/control-nodes.ts";
import { parseAmount, displayAmount } from "../src/interaction/money.ts";

const options = { version: "desert.control/1", kind: "options", id: "delivery", label: "Delivery",
  disabled: false, minSelected: 1, maxSelected: 1, selected: [], options: [
    { value: "collect", label: "Collect", disabled: false },
    { value: "ship", label: "Ship", disabled: false },
    { value: "unavailable", label: "Unavailable", disabled: true },
  ] };

test("options derive one or many selection from cardinality, not separate contracts", () => {
  const source = controlNode(options);
  const event = { kind: "options.change", control: "delivery", selected: ["collect"] };
  assert.equal(applyControlEvent(source, event).node.kind, "options");
  assert.throws(() => applyControlEvent(source, { ...event, selected: ["collect", "ship"] }));
  assert.throws(() => applyControlEvent(source, { ...event, selected: ["unavailable"] }));
  assert.throws(() => controlNode({ ...options, maxSelected: 0 }));
  assert.throws(() => controlNode({ ...options, selected: ["collect", "collect"] }));
  const multiple = controlNode({ ...options, maxSelected: 2 });
  assert.equal(applyControlEvent(multiple, { ...event, selected: ["collect", "ship"] }).node.kind, "options");
  assert.throws(() => applyControlEvent(controlNode({ ...options, disabled: true }), event));
  const retained = controlNode({ ...options, maxSelected: 2, selected: ["unavailable"] });
  assert.equal(applyControlEvent(retained, { ...event, selected: ["unavailable", "collect"] }).node.kind, "options");
  assert.throws(() => applyControlEvent(retained, { ...event, selected: ["collect"] }));
});

test("money preserves exact decimal units without binary floating arithmetic or rounding", () => {
  assert.equal(parseAmount("9007199254740993.07", 2), "900719925474099307");
  assert.equal(displayAmount("900719925474099307", 2), "9007199254740993.07");
  assert.equal(parseAmount("0.10", 2), "10");
  assert.throws(() => parseAmount("1.005", 2));
  assert.throws(() => parseAmount("1e3", 2));
  const money = controlNode({ version: "desert.control/1", kind: "money", id: "amount", label: "Amount",
    disabled: false, required: true, currencies: [{ code: "ARS", scale: 2 }], currency: "ARS", minorUnits: null });
  assert.equal(applyControlEvent(money, { kind: "money.change", control: "amount", currency: "ARS", minorUnits: "100" }).node.kind, "money");
  assert.throws(() => applyControlEvent(money, { kind: "money.change", control: "amount", currency: "USD", minorUnits: "100" }));
});

test("dates use calendar dates, reject impossible days and enforce declared bounds", () => {
  const date = { version: "desert.control/1", kind: "date", id: "date", label: "Date", disabled: false,
    required: true, value: null, minimum: "2024-02-01", maximum: "2024-03-01" };
  const node = controlNode(date);
  assert.equal(applyControlEvent(node, { kind: "date.change", control: "date", value: "2024-02-29" }).node.kind, "date");
  for (const value of ["2024-02-30", "2024-01-31", "2024-03-02", "2024-02-29T00:00:00Z"]) {
    assert.throws(() => applyControlEvent(node, { kind: "date.change", control: "date", value }));
  }
});

test("media and colored labels are closed, accessible descriptors, not product markup", () => {
  const tag = { version: "desert.control/1", kind: "tag", id: "state", label: "Ready", disabled: false, tone: "success" };
  assert.equal(controlNode(tag).kind, "tag");
  assert.throws(() => controlNode({ ...tag, color: "#00ff00" }));
  const image = { version: "desert.control/1", kind: "image", id: "cover", label: "Notebook cover", disabled: false,
    source: "/bank-image.svg", alt: "A notebook on a desk", aspect: "landscape" };
  assert.equal(controlNode(image).kind, "image");
  assert.throws(() => controlNode({ ...image, source: "javascript:alert(1)" }));
  assert.throws(() => controlNode({ ...image, alt: "" }));
  assert.equal(controlNode({ version: "desert.control/1", kind: "avatar", id: "person", label: "Alex Rivera",
    disabled: false, source: null, fallback: "AR" }).kind, "avatar");
});
