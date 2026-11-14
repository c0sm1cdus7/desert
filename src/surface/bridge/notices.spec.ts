import { afterEach, expect, it } from "vitest";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { salesTool } from "../../../tests/support/shop.ts";
import { noticesOf } from "./notices.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));

it("11: directs a need only to its holder, while undirected needs still reach all holders", () => {
  const rig = shopRig({ grants: { ana: ["sales"], beto: ["sales"], carla: [] } });
  rigs.push(rig);
  const tool = {
    ...salesTool,
    needs: () => [
      { target: "sales", why: "Para Ana", to: "ana" },
      { target: "sales/s1", why: "Para Beto", to: "beto" },
      { target: "sales", why: "Para Carla", to: "carla" },
      { target: "sales", why: "Para todos" },
    ],
  };
  const read = (me: string) => {
    const ports = rig.ports(me, () => 0);
    return noticesOf({ ...ports, act: value => ports.act(value, 0) }, tool, {
      name: "Ventas",
      titleOf: () => "Venta 1",
    }).notices().needs;
  };
  expect(read("ana")).toEqual([
    { title: "Ventas", detail: "Para Ana" },
    { title: "Ventas", detail: "Para todos" },
  ]);
  expect(read("beto")).toEqual([
    { title: "Venta 1", detail: "Para Beto", opens: "sales/s1" },
    { title: "Ventas", detail: "Para todos" },
  ]);
  expect(read("carla")).toEqual([]);
  expect(read("outsider")).toEqual([]);
});
