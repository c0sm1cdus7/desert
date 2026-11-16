// A tool's text view as rows: nothing a tool wrote is dropped, and a label is always the program's word.
import { describe, expect, it } from "vitest";
import { briefOf, listedIn, rowsIn } from "./rows.ts";

const labels: Readonly<Record<string, string>> = { count: "Cantidad", open: "Abierto", notes: "Notas" };
const label = (key: string): string => {
  const word = labels[key];
  if (word === undefined) throw new Error(`no words for ${key}`);
  return word;
};

describe("a text view read as rows", () => {
  it("reads a line that names an id as one row that opens it, in the words it wrote", () => {
    expect(
      rowsIn('{"id":"sales/s1","text":"s1","detail":"$ 10"}\n{"id":"sales/s2","name":"s2","by":"ana"}', label),
    ).toEqual([
      { title: "s1", detail: "$ 10", opens: "sales/s1" },
      { title: "s2", detail: "ana", opens: "sales/s2" },
    ]);
    expect(rowsIn('{"id":"sales/s3"}', label)).toEqual([{ title: "sales/s3", opens: "sales/s3" }]);
  });

  it("reads anything else as a label and its value, says the label of several once, and keeps a zero and a no", () => {
    expect(rowsIn('{"count":0,"open":false,"notes":["a","b"]}', label)).toEqual([
      { title: "Cantidad", detail: "0", still: true },
      { title: "Abierto", detail: "false", still: true },
      { title: "Notas", detail: "a", still: true },
      { title: "", detail: "b", still: true },
    ]);
    expect(rowsIn("plain words\n\n", label)).toEqual([{ title: "plain words" }]);
    expect(rowsIn('{"count":null,"notes":""}', label)).toEqual([]);
    expect(() => rowsIn('{"drawer":1}', label)).toThrow("no words for drawer");
  });

  it("gives every listed thing a row, also one the view did not write, and opens only what is listed", () => {
    const shown = [{ title: "s1", opens: "sales/s1" }, { title: "gone", opens: "sales/old" }, { title: "a note" }];
    expect(listedIn(["sales/s1", "sales/s%202"], shown)).toEqual([
      { title: "s1", opens: "sales/s1" },
      { title: "gone" },
      { title: "a note" },
      { title: "sales/s 2", opens: "sales/s%202" },
    ]);
  });

  it("says only how many when a summary is structured, and the summary itself when it is words", () => {
    expect(briefOf('["a","b"]\n["c"]')).toBe("3");
    expect(briefOf("[]")).toBe("");
    expect(briefOf("2 open")).toBe("2 open");
  });
});
