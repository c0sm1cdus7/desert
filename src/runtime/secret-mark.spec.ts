import { expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixture, home, time } from "../../tests/support/secret-rig.ts";
import { startHouse } from "./house-runtime.ts";
for (const content of ["{", "null", '{"version":1}', '{"version":99,"reviewed":0,"unreviewable":0}']) {
  it(`the unreadable mark fails typed and names the file: ${content}`, () => {
    const rig = fixture();
    const path = home();
    const file = join(path, "secret-protection.json");
    writeFileSync(file, content);
    const message: unknown = expect.stringContaining(file);
    expect(() => startHouse(path, rig.options, time)).toThrow(
      expect.objectContaining({ code: "E-SECRET-PROTECTION", file, message }),
    );
    expect(readFileSync(file, "utf8")).toBe(content);
  });
}
it("a mark that is not a file does not return the system's raw exception either", () => {
  const rig = fixture();
  const path = home();
  const file = join(path, "secret-protection.json");
  mkdirSync(file);
  expect(() => startHouse(path, rig.options, time)).toThrow(
    expect.objectContaining({ code: "E-SECRET-PROTECTION", file }),
  );
});
