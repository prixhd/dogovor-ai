import { expect, test } from "@playwright/test";

test("guest sees counter and protected pages redirect to login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("ai-quota")).toContainText(/из 5 бесплатных вопросов/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  await page.goto("/c/no-such-template");
  await expect(page.getByText("404")).toBeVisible();
});
