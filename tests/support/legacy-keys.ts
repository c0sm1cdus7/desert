import type { KeyStore } from "../../src/tools/tool-contract.ts";
export class MemoryKeys implements KeyStore {
  readonly values = new Map<string, string>();
  get = (provider: string) => Promise.resolve(this.values.get(provider));
  set(provider: string, value: string): Promise<void> {
    this.values.set(provider, value);
    return Promise.resolve();
  }
  remove(provider: string): Promise<void> {
    this.values.delete(provider);
    return Promise.resolve();
  }
}
