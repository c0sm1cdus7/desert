import "../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { directedShop } from "../../tests/support/directed-shop.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { noticeChecks } from "./promised-notices.ts";
import { promisedChecks } from "./promised.ts";
import { stillOwing } from "../../tests/support/settling-shop.ts";

it.each(["ana", "beto"])("12: derives Attention from both the actor and recipient when the need names %s", async to => {
  const program = directedShop(true, to);
  const checks = noticeChecks(program, shopShown).filter(check => check.name.endsWith("in Attention with why"));
  expect(checks).toHaveLength(2);
  for (const check of checks) await check.run();
});

it("12: detects a recipient omitted by the case in both the house and Attention checks", async () => {
  const program = directedShop(false);
  const checks = [...promisedChecks(program), ...noticeChecks(program, shopShown)].filter(
    check => check.name === stillOwing || check.name === `${stillOwing}, in Attention with why`,
  );
  expect(checks).toHaveLength(2);
  for (const check of checks) await expect(check.run()).rejects.toThrow();
});

it("12: detects a need absent only from its recipient's view", async () => {
  const good = directedShop();
  const program = {
    ...good,
    registry: good.registry.map(tool =>
      tool.id !== "sales"
        ? tool
        : {
            ...tool,
            needs: (state: Parameters<NonNullable<typeof tool.needs>>[0], now: number) =>
              state.by === "beto" ? [] : (tool.needs?.(state, now) ?? []),
          },
    ),
  };
  const checks = noticeChecks(program, shopShown).filter(
    check => check.name === `${stillOwing}, in Attention with why`,
  );
  expect(checks).toHaveLength(1);
  await expect(checks[0]?.run()).rejects.toThrow(/beto/);
});

it.each(["nadie", "mind:sales", "carla"])(
  "adversarial attention: rejects an invisible promised recipient %s",
  async to => {
    const program = directedShop(true, to);
    const checks = [...promisedChecks(program), ...noticeChecks(program, shopShown)];
    const failed: { name: string; reason: string }[] = [];
    for (const check of checks)
      await check.run().catch((error: unknown) => failed.push({ name: check.name, reason: String(error) }));
    expect(failed).toHaveLength(1);
    expect(failed[0]?.name).toBe(`${stillOwing}, in Attention with why`);
    expect(failed[0]?.reason).toContain(to);
  },
);
