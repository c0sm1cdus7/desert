import { expect, it, afterEach } from "vitest";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { effect } from "../house/facts.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));

for (const outerFails of [false, true])
  it(`queued siblings survive only their own successful scope (outer rollback: ${outerFails})`, () => {
    const rig = shopRig();
    rigs.push(rig);
    const seen: string[] = [];
    const bus = rig.bus;
    const write = (general: string) => bus.emit(effect("scene", { general }, "ana"));
    bus.on("scene", e => seen.push(e.data.general));
    bus.on("boot", () => {
      write("before");
      try {
        bus.together(() => {
          write("outer");
          expect(() =>
            bus.together(() => {
              write("inner");
              throw new Error("inner");
            }),
          ).toThrow("inner");
          bus.together(() => write("saved"));
          if (outerFails) throw new Error("outer");
        });
      } catch (error) {
        expect(error instanceof Error ? error.message : String(error)).toBe("outer");
      }
      write("after");
    });
    rig.boot();
    const expected = outerFails ? ["before", "after"] : ["before", "outer", "saved", "after"];
    expect(seen).toEqual(expected);
    expect(
      rig
        .facts()
        .filter(e => e.kind === "scene")
        .map(e => e.data.general),
    ).toEqual(expected);
    expect(rig.state().house.scenes.get("ana")?.data.general).toBe("after");
    write("next");
    expect(seen).toEqual([...expected, "next"]);
  });
