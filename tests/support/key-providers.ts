import { afterEach } from "vitest";
import { MemoryHouseKeys, type HouseKeyProvider } from "../../src/keychain/custody/house-keys.ts";
import { MacOSHouseKeys } from "../../src/keychain/macos/macos-house-keys.ts";
import { RootHouseKeys } from "../../src/keychain/cloud/root-house-keys.ts";
import { fakeKeychain } from "./fake-keychain.ts";
const roots: RootHouseKeys[] = [];
afterEach(() => roots.splice(0).forEach(keys => keys.dispose()));
function rootKeys(home: string): RootHouseKeys {
  const root = Buffer.alloc(32, 71);
  try {
    const keys = new RootHouseKeys(root, home);
    roots.push(keys);
    return keys;
  } finally {
    root.fill(0);
  }
}
export const keyProviders = [
  { name: "memory", open: () => new MemoryHouseKeys() },
  { name: "macos-fake", open: () => new MacOSHouseKeys(fakeKeychain().command) },
  { name: "root", open: rootKeys },
];
export function reopenKeys(home: string, keys: HouseKeyProvider): HouseKeyProvider {
  if (!(keys instanceof RootHouseKeys)) return keys;
  keys.dispose();
  return rootKeys(home);
}
