import { resolve } from "node:path";
import type { Page } from "playwright";
import { InspectionApplication } from "../fixtures/inspection-product.ts";
import { browserFixture, settleMotion } from "./fixture.ts";

export async function inspectionFixture() {
  return browserFixture({ application: InspectionApplication,
    buildDirectory: resolve(process.env.DESERT_INSPECTION_BUILD ?? "build/notebook-inspection-web") });
}

export async function openCatalog(page: Page) {
  await settleMotion(page);
  const destination = page.getByRole("button", { name: "Visual catalog", exact: true });
  const trigger = page.getByRole("button", { name: "Show navigation", exact: true });
  await destination.or(trigger).first().waitFor({ state: "visible" });
  if (!await destination.isVisible()) await trigger.click();
  await destination.click();
  await page.locator("[data-public-catalog-bank]").waitFor();
  await settleMotion(page);
}
