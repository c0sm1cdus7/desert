// Real persistence only in a disposable synthetic fixture, never the house vault path.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SecretVault } from "./secret-vault.ts";
import { MemoryHouseKeys } from "./custody/house-keys.ts";
import { vocabulary, effect } from "../../journal/events.ts";
import type { Program } from "../../tools/tool-contract.ts";
const schema = Type.Object({ value: Type.String({ secret: true }) });
for (const [name, value] of [
  ["vacío", ""],
  ["uno", "Ω"],
  ["once", "abcdefghijk"],
  ["doce", "abcdefghijkl"],
  ["trece", "abcdefghijklm"],
  ["vocabulario", "act-result"],
  ["multilínea", "uno\ndos"],
]) {
  it(`recarga y reutiliza la referencia sin usar la bóveda como diccionario de texto: ${name}`, () => {
    const home = mkdtempSync(join(tmpdir(), "a01-vault-fixture-"));
    const file = join(home, "vault-fixture.sqlite");
    const words = vocabulary({});
    const event = effect("act", { object: "vault", option: "set", input: { value } }, "ana");
    const keys = new MemoryHouseKeys();
    const first = new SecretVault<Program>(file, words.event, keys);
    let second: SecretVault<Program> | undefined;
    try {
      const before = first.scope(schema, { value }, () => first.write(event));
      expect(JSON.stringify(before.data.input) !== JSON.stringify({ value })).toBe(true);
      first.close();
      second = new SecretVault<Program>(file, words.event, keys);
      expect(second.scrub({ text: value }).text === value).toBe(true);
      const reopened = second;
      const after = reopened.scope(schema, { value }, () => reopened.write(event));
      expect(after.data.input).toEqual(before.data.input);
    } finally {
      first.close();
      second?.close();
      rmSync(home, { recursive: true, force: true });
    }
  });
}
