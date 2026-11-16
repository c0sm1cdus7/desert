// Shared JSON readings retain their distinct boundaries and never coerce their inputs.
import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import { at, field, isList, isRecord, list, plain, wholeNumber } from "./json-values.ts";

describe("shared JSON values", () => {
  it("isRecord accepts objects and rejects null, arrays and primitive values", () => {
    for (const value of [{}, { value: 1 }, Object.create(null), new Date(0)]) expect(isRecord(value)).toBe(true);
    for (const value of [null, undefined, [], [1], "x", 0, true, () => 1]) expect(isRecord(value)).toBe(false);
  });
  it("isList accepts empty and populated arrays and rejects other values", () => {
    for (const value of [[], [1], Object.freeze([2])]) expect(isList(value)).toBe(true);
    for (const value of [null, undefined, {}, { length: 1 }, "x", 0, false]) expect(isList(value)).toBe(false);
  });
  it("at reads an object property while rejecting array properties and nonobjects", () => {
    const value = { value: { nested: true } };
    expect(at(value, "value")).toBe(value.value);
    expect(at(Object.create({ inherited: 3 }), "inherited")).toBe(3);
    expect(at(value, "missing")).toBeUndefined();
    for (const value of [[1], null, undefined, "abc", 4]) expect(at(value, "length")).toBeUndefined();
  });
  it("field reads object and array properties while rejecting nonobjects", () => {
    const value = { value: { nested: true } };
    expect(field(value, "value")).toBe(value.value);
    expect(field(["first"], "0")).toBe("first");
    expect(field([1, 2], "length")).toBe(2);
    expect(field(Object.create({ inherited: 3 }), "inherited")).toBe(3);
    expect(field(value, "missing")).toBeUndefined();
    for (const value of [null, undefined, "abc", 4]) expect(field(value, "length")).toBeUndefined();
  });
  it("list preserves an array by identity and gives an empty array for everything else", () => {
    for (const value of [[], [1, { nested: true }], Object.freeze([2])]) expect(list(value)).toBe(value);
    for (const value of [null, undefined, {}, { length: 1 }, "x", 0, false]) expect(list(value)).toEqual([]);
  });
  it("plain preserves strings and uses JSON spelling including its unsupported values", () => {
    expect(plain('  a"b\n')).toBe('  a"b\n');
    expect(plain("")).toBe("");
    expect(plain({ a: [1, true, null] })).toBe('{"a":[1,true,null]}');
    expect(plain(3)).toBe("3");
    expect(plain(false)).toBe("false");
    expect(plain(null)).toBe("null");
    expect(plain(undefined)).toBeUndefined();
    expect(() => plain(1n)).toThrow(TypeError);
  });
  it("wholeNumber includes zero and the safe maximum and excludes fractions and other types", () => {
    for (const value of [0, 1, Number.MAX_SAFE_INTEGER]) expect(Value.Check(wholeNumber, value)).toBe(true);
    for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, "1", null, undefined])
      expect(Value.Check(wholeNumber, value)).toBe(false);
  });
});
