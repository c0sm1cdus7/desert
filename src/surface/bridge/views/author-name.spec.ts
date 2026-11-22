import { afterEach, expect, it } from "vitest";
import { shopRig } from "../../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../../tests/support/shop.ts";
import { effect } from "../../../house/facts.ts";
import { houseTools } from "../assembly/house-tools.ts";
import { authorName } from "./author-name.ts";
import { rowsIn } from "./rows.ts";
import { ownView } from "./presented.ts";
import { noticesOf } from "./notices.ts";
import { salesTool } from "../../../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
function setup() {
  const rig = shopRig();
  rigs.push(rig);
  rig.bus.emit(effect("named", { identity: "beto", name: "Alberto" }, "ana"));
  rig.attend("beto", "sales");
  expect(rig.act("beto", "register", { sale: "s1", total: 100 }, "sales")).toMatchObject({ status: "accepted" });
  const ports = rig.ports("ana", () => 5000);
  const tool = houseTools(ports, shopShown).find(tool => tool.id === "sales");
  if (!tool) throw new Error("Missing sales surface");
  return { rig, ports, tool };
}
it("updates the name live and keeps authorship, destination and history when closing and reopening", () => {
  const { rig, tool } = setup();
  const expected = (name: string) => {
    expect(tool.notices?.().news).toContainEqual({ title: "Registrada · s1", detail: name, opens: "sales/s1" });
    expect(tool.view("sales/s1").flatMap(stack => stack.rows)).toContainEqual({
      title: "Creó",
      detail: name,
      still: true,
    });
    expect(tool.view("sales/s1").at(-1)?.rows[0]?.detail).toMatch(new RegExp(`^${name} ·`));
  };
  expected("Alberto");
  rig.bus.emit(effect("named", { identity: "beto", name: "Beto Gómez" }, "ana"));
  expected("Beto Gómez");
  rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  rig.restart();
  expected("Beto Gómez");
  expect(rig.state().tools.sales.get("s1")?.by).toBe("beto");
  expect(
    rig
      .state()
      .entries.filter(entry => entry.data.target === "sales/s1")
      .map(entry => entry.data.author),
  ).toContain("beto");
});
it("two identities with the same name still have independent news and destinations", () => {
  const { rig, tool } = setup();
  rig.bus.emit(effect("granted", { identity: "carla", tools: ["sales"] }, "ana"));
  rig.bus.emit(effect("named", { identity: "carla", name: "Alberto" }, "ana"));
  rig.attend("carla", "sales");
  rig.act("carla", "register", { sale: "s2", total: 200 }, "sales");
  expect(tool.notices?.().news).toEqual([
    { title: "Registrada · s2", detail: "Alberto", opens: "sales/s2" },
    { title: "Registrada · s1", detail: "Alberto", opens: "sales/s1" },
  ]);
  tool.rendered?.("sales/s1");
  expect(tool.notices?.().news).toEqual([{ title: "Registrada · s2", detail: "Alberto", opens: "sales/s2" }]);
});
it("keeps diagnostics and leaves the ids for the notice reader without human presentation", () => {
  const { rig, ports, tool } = setup();
  const raw = noticesOf({ ...ports, act: value => ports.act(value, 0) }, salesTool, { name: "Ventas" });
  expect(raw.notices().news[0]?.detail).toBe("beto");
  rig.bus.emit(
    effect(
      "tool-entry",
      { tool: "sales", target: "sales/s1", author: "beto", text: "Revisar", diagnostic: "Falta el dato\nDetalle" },
      "beto",
    ),
  );
  expect(tool.notices?.().news[0]?.detail).toBe("Falta el dato");
  expect(raw.notices().news[0]?.detail).toBe("Falta el dato");
});
it("resolves by and author in lists and own data without changing free text or ids", () => {
  const { ports } = setup();
  const name = authorName(ports);
  const labels = (key: string) => key;
  expect(
    rowsIn(
      [
        '{"id":"sales/beto","text":"beto","by":"beto"}',
        '{"id":"sales/2","author":"beto"}',
        '{"id":"sales/3","detail":"beto"}',
      ].join("\n"),
      labels,
      undefined,
      name,
    ),
  ).toEqual([
    { title: "beto", detail: "Alberto", opens: "sales/beto" },
    { title: "sales/2", detail: "Alberto", opens: "sales/2" },
    { title: "sales/3", detail: "beto", opens: "sales/3" },
  ]);
  expect(rowsIn('{"author":["beto","desconocida"],"text":"beto"}', labels, undefined, name)).toEqual([
    { title: "author", detail: "Alberto", still: true },
    { title: "", detail: "desconocida", still: true },
    { title: "text", detail: "beto", still: true },
  ]);
  expect(
    ownView(
      [{ title: "Autores", empty: "", reads: { author: "Autor" } }],
      '{"author":"beto"}',
      "sales",
      () => undefined,
      name,
    )[0]?.rows,
  ).toEqual([{ title: "Autor", detail: "Alberto", still: true }]);
});
