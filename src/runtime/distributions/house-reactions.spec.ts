import "../../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { componer } from "./compose.ts";
import { programa } from "../../tools/installable/program.ts";
import { sampleMetadata, sampleBody, sampleOptions } from "../../../tests/support/installable-program.ts";
import { startHouse } from "../house-runtime.ts";
import { home, time } from "../../../tests/support/upgrade-support.ts";
import { effect } from "../../house/facts.ts";
const reacting = programa(sampleMetadata, {
  ...sampleBody,
  herramientas: Object.fromEntries(
    Object.entries(sampleBody.herramientas).map(([name, group]) => [
      name,
      { ...group, reactions: { boot: { when: "boot" as const, act: "add" } } },
    ]),
  ),
});
it.each([true, false])(
  "keeps both same-named group reactions, their program mind and retry receipts with kit=%s",
  async granted => {
    const { program } = componer({ ...sampleOptions, programas: [reacting] });
    const path = home();
    const options = {
      ...program,
      by: "demo",
      creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["notas"] }] },
    };
    const house = startHouse(path, options, time);
    try {
      if (granted)
        house.bus.emit(
          effect(
            "kit-set",
            {
              version: 2,
              holder: "mind:notas",
              kit: { version: 2, selections: [{ kind: "program", program: "notas" }] },
            },
            "ana",
          ),
        );
      await house.tools.recoverReactions();
      expect(house.tools.state().tools.notas.count).toBe(granted ? 2 : 0);
      expect(house.tools.pendingReactions()).toHaveLength(granted ? 0 : 2);
      const attempts = house.journal.replay<string[]>([], (all, event) =>
        event.kind === "act" && event.data.reaction
          ? [...all, `${event.by}:${event.data.object}:${event.data.option}`]
          : all,
      );
      expect(attempts).toEqual(["mind:notas:notas/personal:personal/add", "mind:notas:notas/shared:shared/add"]);
      if (!granted) {
        house.bus.emit(
          effect(
            "kit-set",
            {
              version: 2,
              holder: "mind:notas",
              kit: { version: 2, selections: [{ kind: "program", program: "notas" }] },
            },
            "ana",
          ),
        );
        await house.tools.recoverReactions();
      }
      await house.tools.recoverReactions();
      expect(house.tools.state().tools.notas.count).toBe(2);
      expect(
        house.journal.replay<string[]>([], (all, event) => (event.kind === "notas/anotada" ? [...all, event.by] : all)),
      ).toEqual(["mind:notas", "mind:notas"]);
    } finally {
      house.close();
    }
    const reopened = startHouse(path, options, time);
    try {
      await reopened.tools.recoverReactions();
      expect(reopened.tools.state().tools.notas.count).toBe(4);
      expect(reopened.tools.pendingReactions()).toEqual([]);
    } finally {
      reopened.close();
    }
  },
);

it.each(["missing-action", "missing-notice"])("rejects an unbindable reaction: %s", failure => {
  const group = sampleBody.herramientas.personal;
  const invalid = programa(sampleMetadata, {
    ...sampleBody,
    herramientas: {
      personal: {
        ...group,
        reactions: { start: { when: "boot" as const, act: failure === "missing-action" ? "absent" : "add" } },
      },
    },
  });
  const candidate =
    failure === "missing-notice"
      ? {
          ...invalid,
          install: () => {
            const installed = invalid.install();
            return {
              ...installed,
              tool: { ...installed.tool, reactions: { start: { when: "unknown", act: "personal/add" } } },
            };
          },
        }
      : invalid;
  expect(() => componer({ ...sampleOptions, programas: [candidate] })).toThrow();
});
it("rejects a reaction to an object action without a destination", () => {
  const invalid = programa(sampleMetadata, {
    ...sampleBody,
    herramientas: {
      personal: { ...sampleBody.herramientas.personal, reactions: { boot: { when: "boot", act: "edit" } } },
    },
  });
  expect(() => componer({ ...sampleOptions, programas: [invalid] })).toThrow();
});
it("recovers denied notices after reopening and never repeats their accepted receipts", async () => {
  const { program } = componer({ ...sampleOptions, programas: [reacting] });
  const path = home();
  const options = {
    ...program,
    by: "demo",
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["notas"] }] },
  };
  const first = startHouse(path, options, time);
  try {
    await first.tools.recoverReactions();
    expect(first.tools.pendingReactions()).toHaveLength(2);
  } finally {
    first.close();
  }
  const second = startHouse(path, options, time);
  try {
    await second.tools.recoverReactions();
    expect(second.tools.pendingReactions()).toHaveLength(4);
    second.bus.emit(
      effect(
        "kit-set",
        { version: 2, holder: "mind:notas", kit: { version: 2, selections: [{ kind: "program", program: "notas" }] } },
        "ana",
      ),
    );
    await second.tools.recoverReactions();
    expect(second.tools.state().tools.notas.count).toBe(4);
    await second.tools.recoverReactions();
    expect(second.tools.state().tools.notas.count).toBe(4);
    expect(second.tools.pendingReactions()).toEqual([]);
  } finally {
    second.close();
  }
});
