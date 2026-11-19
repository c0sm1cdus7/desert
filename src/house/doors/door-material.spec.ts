// Known credentials disappear inside arbitrary strings and object keys without changing ordinary text.
import { expect, it } from "vitest";
import { doorFingerprint, scrubDoorText, scrubDoorValue } from "./door-material.ts";
import { emptyDoors, type DoorState } from "./door-state.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
it.each([false, true])("scrubs embedded current and historical fingerprints (legacy=%s)", legacy => {
  const materials = ["synthetic_key-with-dashes", "other+synthetic/key=", "🔑synthetic"];
  const state: DoorState = {
    ...emptyDoors,
    keys: new Map(
      materials.map((material, i) => [
        String(i),
        {
          id: String(i),
          identity: "ana",
          door: "agent",
          fingerprint: doorFingerprint(material),
          revoked: i > 0,
          ...(legacy ? {} : { length: material.length }),
        },
      ]),
    ),
  };
  for (const material of materials) {
    for (const [prefix, suffix] of [
      ["", ""],
      ["token_", "_end"],
      ["word", "word"],
      ["a-", "-b"],
      ["á", "🙂"],
    ]) {
      const text = `${prefix}${material}${suffix}`;
      const expected = `${prefix}${mcpTexts.redacted}${suffix}`;
      expect(scrubDoorText(text, state)).toBe(expected);
      expect(scrubDoorValue({ [text]: [text, new Map([[text, new Set([text])]])] }, state)).toEqual({
        [expected]: [expected, new Map([[expected, new Set([expected])]])],
      });
    }
  }
  expect(scrubDoorText("ordinary_token_and-word", state)).toBe("ordinary_token_and-word");
});
it("redacts overlapping and repeated matches without exposing a remainder", () => {
  const keys = ["abcde", "defgh"].map(
    (material, i) =>
      [
        String(i),
        {
          id: String(i),
          identity: "ana",
          door: "agent" as const,
          fingerprint: doorFingerprint(material),
          length: 5,
          revoked: false,
        },
      ] as const,
  );
  expect(scrubDoorText("xabcdefghyabcdez", { ...emptyDoors, keys: new Map(keys) })).toBe(
    `x${mcpTexts.redacted}y${mcpTexts.redacted}z`,
  );
});
