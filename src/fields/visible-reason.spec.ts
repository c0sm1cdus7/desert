// A free text with nothing visible says so at Enter, in any program: the rule its field and the house both hold.
import { expect, it } from "vitest";
import { text } from "./fields.ts";
import { fieldSeat as seat } from "../../tests/support/field-seat.ts";

it.each(["​", "⠀", "ㅤ​"])("free text made only of %j says it needs something visible", typed => {
  const hands = seat(text("Nota", "Nota"));
  hands.send({ kind: "type", text: typed });
  hands.send({ kind: "confirm" });
  expect(hands.reasons()).toEqual(["texto con algo visible"]);
  expect(hands.session().at(-1)).toMatchObject({ phase: "asking" });
  hands.send({ kind: "type", text: "a" });
  expect(hands.reasons()).toEqual([]);
  expect(hands.send({ kind: "confirm" })).toBeDefined();
});
it("a visible text that misses a declared pattern still says its format is invalid", () => {
  const hands = seat({ ...text("Nombre", "Nombre"), pattern: "^[a-z]+$" });
  hands.send({ kind: "type", text: "123" });
  hands.send({ kind: "confirm" });
  expect(hands.reasons()).toEqual(["formato inválido"]);
});
