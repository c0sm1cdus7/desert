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
