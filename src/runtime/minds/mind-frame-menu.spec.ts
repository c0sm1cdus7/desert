// The menu travels in the cached layers: what changes with every journey is said in words, never listed.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { menuText } from "./mind-frame-menu.ts";
const input = Type.Object({});
const item = (act: string, target: string) => ({ tool: "journey", act, target, input, scope: "control" as const });
it("says the open journeys an act may name in words, and keeps the scope's own journey and other targets", () => {
  const menu = [item("resume", "journey:a"), item("resume", "journey:b"), item("wait", "journey:own")];
  const text = menuText(
    [...menu, { ...item("threads/say", "talk/1"), tool: "talk", scope: "work" }],
    "es",
    "journey:own",
  );
  expect(text).toBe("resume → uno de los journeys abiertos, por su id\nwait → journey:own\nthreads/say → talk/1");
  expect(menuText(menu.slice(0, 1), "es")).toBe(menuText(menu.slice(0, 2), "es"));
});
it("says many targets under one folder by their pattern, so a new thing does not change the cached menu", () => {
  const say = (target: string) => ({ ...item("threads/say", target), tool: "talk", scope: "work" as const });
  const five = Array.from({ length: 5 }, (_, index) => say(`talk/threads/${index + 1}`));
  expect(menuText(five, "es")).toBe("threads/say → talk/threads/<id>");
  expect(menuText([...five, say("talk/threads/6")], "es")).toBe(menuText(five, "es"));
  expect(menuText(five.slice(0, 2), "es")).toBe("threads/say → talk/threads/1, talk/threads/2");
});
it("lists the journeys by id where the menu is not cached, as the supervisor's", () => {
  const menu = [item("interrupt", "journey:a"), item("interrupt", "journey:b")];
  expect(menuText(menu, "es", undefined, false)).toBe("interrupt → journey:a, journey:b");
});
