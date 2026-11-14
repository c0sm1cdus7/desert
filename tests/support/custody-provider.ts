import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MemoryHouseKeys, type HouseKeyProvider } from "../../src/adapters/secrets/custody/house-keys.ts";
const metadata = new MemoryHouseKeys();
/** Test-only wrapper for hostile key suppliers; metadata remains shared across reopening wrappers. */
export function stubKeys(overrides: Partial<HouseKeyProvider>): HouseKeyProvider {
  return {
    key: metadata.key.bind(metadata),
    has: () => true,
    head: metadata.head.bind(metadata),
    anchor: metadata.anchor.bind(metadata),
    forget: metadata.forget.bind(metadata),
    forgetHouse: metadata.forgetHouse.bind(metadata),
    ...overrides,
  };
}
/** Process-cut fixtures persist only public metadata. All keys are derived from public synthetic test accounts. */
export function processKeys(home: string): HouseKeyProvider {
  const path = join(home, "fake-provider.json");
  const load = (): Record<string, string> => {
    if (!existsSync(path)) return {};
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object") throw new Error("fixture");
    return Object.fromEntries(
      Object.entries(value).filter((pair): pair is [string, string] => typeof pair[1] === "string"),
    );
  };
  const put = (key: string, value: string) => writeFileSync(path, JSON.stringify({ ...load(), [key]: value }));
  return {
    key: (account, create) => {
      if (!create && load()[account] !== "present") throw new Error("missing fixture key");
      if (create) put(account, "present");
      return createHash("sha256").update(`SYNTHETIC:${account}`).digest();
    },
    has: account => load()[account] === "present",
    forget: account => put(account, "deleted"),
    head: house => {
      const encoded = load()[`head:${house}`];
      if (!encoded) return undefined;
      const [count, authentication = ""] = encoded.split(":");
      return { count: Number(count), authentication };
    },
    anchor: (house, head) => put(`head:${house}`, `${head.count}:${head.authentication}`),
    forgetHouse: house => {
      for (const account of Object.keys(load()))
        if (account === house || account.startsWith(`${house}-secret-`)) put(account, "deleted");
      put(`head:${house}`, "");
    },
  };
}
