// Copy only ordinary JSON data, without invoking accessors or conversion hooks.
import { Value } from "@sinclair/typebox/value";
import { actEnvelope } from "../../catalogs/acts.ts";
import { actLimits } from "../../catalogs/levers.ts";

const maxBytes = actLimits.inputBytes;
class Copier {
  private readonly seen = new Set<object>();
  private budget = maxBytes;
  private spend(bytes: number) {
    this.budget -= bytes;
    if (this.budget < 0) throw Error("size");
  }
  copy(item: unknown): unknown {
    if (item === null || typeof item === "boolean") {
      this.spend(item === false ? 5 : 4);
      return item;
    }
    if (typeof item === "string") {
      if (Buffer.byteLength(item, "utf8") > this.budget) throw Error("size");
      this.spend(Buffer.byteLength(JSON.stringify(item), "utf8"));
      return item;
    }
    if (typeof item === "number" && Number.isFinite(item) && !Object.is(item, -0)) {
      this.spend(Buffer.byteLength(JSON.stringify(item), "utf8"));
      return item;
    }
    if (typeof item !== "object" || this.seen.has(item)) throw Error("data");
    const array = Array.isArray(item);
    const prototype: unknown = Object.getPrototypeOf(item);
    if (prototype !== (array ? Array.prototype : Object.prototype) && !(prototype === null && !array))
      throw Error("prototype");
    this.seen.add(item);
    const result = this.object(item, array);
    this.seen.delete(item);
    return result;
  }
  private object(item: object, array: boolean): object {
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => typeof key !== "string")) throw Error("symbols");
    const count = keys.length - (array ? 1 : 0);
    this.spend(2 + Math.max(0, count - 1));
    const result: object = array ? [] : {};
    for (const key of keys) {
      if (typeof key !== "string" || (array && key === "length")) continue;
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw Error("property");
      if (array) {
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index < 0 || String(index) !== key || index >= Reflect.get(item, "length"))
          throw Error("array property");
      } else this.spend(Buffer.byteLength(JSON.stringify(key), "utf8") + 1);
      Object.defineProperty(result, key, {
        value: this.copy(descriptor.value),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    if (array && Object.keys(result).length !== Reflect.get(item, "length")) throw Error("holes");
    return result;
  }
}
export function mindInput(value: unknown): unknown {
  const result = new Copier().copy(value);
  if (!Value.Check(actEnvelope, result) || Buffer.byteLength(JSON.stringify(result), "utf8") > maxBytes)
    throw Error("data");
  return result;
}
