// Persiste cuentas y anclas públicas con reemplazo atómico privado; el disco entero restaurado no se detecta.
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { CustodyError, type LedgerHead } from "../custody/house-keys.ts";
const account = Type.String({ pattern: "^[a-z0-9-]+$", maxLength: 128 });
const metadata = Type.Object(
  {
    version: Type.Literal(1),
    accounts: Type.Array(account, { uniqueItems: true }),
    heads: Type.Array(
      Type.Tuple([
        account,
        Type.Object(
          {
            count: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
            authentication: Type.String(),
          },
          { additionalProperties: false },
        ),
      ]),
    ),
  },
  { additionalProperties: false },
);
export type KeyMetadata = Static<typeof metadata>;
export function checkAccount(value: string): void {
  if (!Value.Check(account, value)) throw new CustodyError("E-CUSTODY-KEY");
}
export function checkHead(head: LedgerHead): void {
  if (
    !Number.isSafeInteger(head.count) ||
    head.count < 0 ||
    !(head.count === 0 ? head.authentication === "" : /^[0-9a-f]{64}$/u.test(head.authentication))
  )
    throw new CustodyError("E-CUSTODY-KEY");
}
export function readKeyMetadata(home: string): KeyMetadata {
  let text: string;
  try {
    text = readFileSync(join(home, "custody-keys.json"), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return { version: 1, accounts: [], heads: [] };
    throw new CustodyError("E-CUSTODY-KEY");
  }
  try {
    const value: unknown = JSON.parse(text);
    if (!Value.Check(metadata, value)) throw new CustodyError("E-CUSTODY-KEY");
    if (new Set(value.heads.map(([house]) => house)).size !== value.heads.length)
      throw new CustodyError("E-CUSTODY-KEY");
    value.heads.forEach(([, head]) => checkHead(head));
    return value;
  } catch {
    throw new CustodyError("E-CUSTODY-KEY");
  }
}
export function writeKeyMetadata(home: string, value: KeyMetadata): void {
  const temporary = join(home, `.custody-keys-${randomUUID()}.tmp`);
  try {
    mkdirSync(home, { recursive: true, mode: 0o700 });
    const file = openSync(temporary, "wx", 0o600);
    try {
      writeFileSync(file, JSON.stringify(value));
      fsyncSync(file);
    } finally {
      closeSync(file);
    }
    renameSync(temporary, join(home, "custody-keys.json"));
    const directory = openSync(home, "r");
    try {
      fsyncSync(directory);
    } finally {
      closeSync(directory);
    }
  } finally {
    rmSync(temporary, { force: true });
  }
}
