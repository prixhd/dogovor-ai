import { expect, test, type Page } from "@playwright/test";

const email = `e2e-${Date.now()}@example.test`;
const password = "e2e-demo-password";

async function csrf(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === "csrf_token")?.value ?? "";
}

test("demo: landing → constructor A/B/C → login → docx → cabinet", async ({ page, browser }) => {
  // 1. Landing with search and sticky topics.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Договор за");
  await expect(page.locator("#how .topic-head")).toBeVisible();
  await page.getByLabel("Какой документ нужен?").fill("трудовой");
  await page.getByRole("button", { name: "Найти" }).click();

  // 2. Catalog → employment contract.
  await expect(page).toHaveURL(/\/catalog\?q=/);
  await page.getByRole("link", { name: /Трудовой договор/ }).first().click();
  await expect(page).toHaveURL(/\/c\/trudovoy-dogovor/);

  // Mode A: questionnaire updates the live sheet.
  await page.getByLabel("Номер договора").fill("42");
  await page.getByLabel("Дата договора").fill("2026-11-25");
  const sheet = page.getByRole("article", { name: "Предпросмотр документа" });
  await expect(sheet).toContainText("ТРУДОВОЙ ДОГОВОР № 42");

  // Guest download asks to log in; the draft survives registration.
  await page.getByRole("button", { name: "Скачать .docx" }).first().click();
  await expect(page.getByRole("dialog", { name: "Войдите, чтобы продолжить" })).toBeVisible();
  await page.getByRole("link", { name: "Создать аккаунт" }).click();
  await page.getByLabel("Имя").fill("Демо");
  await page.getByLabel("Почта").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/c\/trudovoy-dogovor/);
  await expect(sheet).toContainText("№ 42");

  // Party cards via API (the card form itself is covered by API tests).
  const token = await csrf(page);
  for (const body of [
    { kind: "org", title: "", data: { name: "ООО «Ромашка»", inn: "7707083893", ogrn: "1027700132195", address: "г. Москва, ул. Вавилова, д. 19", signer_name: "Иванов Иван Иванович", signer_position: "Генеральный директор", signer_basis: "Устава" } },
    { kind: "person", title: "", data: { name: "Петров Пётр Петрович", address: "г. Москва, ул. Ленина, д. 1, кв. 2" } },
  ]) {
    const r = await page.request.post("/api/parties", { data: body, headers: { "X-CSRF-Token": token } });
    expect(r.status()).toBe(201);
  }

  // Mode B: fill both roles from cards.
  await page.getByRole("tab", { name: "По карточке" }).click();
  await page.getByRole("button", { name: "ООО «Ромашка»" }).click();
  await page.getByRole("button", { name: "Петров Пётр Петрович" }).click();
  await expect(sheet).toContainText("ООО «Ромашка», ИНН 7707083893");
  await expect(sheet).toContainText("Петров Пётр Петрович");

  // Remaining required fields.
  await page.getByRole("button", { name: /Работа и срок/ }).click();
  await page.getByLabel("Должность").fill("менеджера по продажам");
  await page.getByLabel("Дата начала работы").fill("2026-12-01");
  await page.getByRole("button", { name: /Оплата и режим/ }).click();
  await page.getByLabel("Оклад в месяц, руб.").fill("80000");
  await expect(sheet).toContainText("80 000 (восемьдесят тысяч) рублей");

  // Mode C: AI proposes edits in favour of the employer; accept all.
  await page.getByRole("tab", { name: "С ИИ" }).click();
  const ai = page.getByRole("complementary", { name: "ИИ-помощник" });
  await ai.getByRole("button", { name: "В пользу: работодатель" }).click();
  await ai.getByRole("button", { name: "Сделай договор в пользу моей стороны" }).click();
  await expect(ai.getByText("Новый пункт").first()).toBeVisible();
  await ai.getByRole("button", { name: /Принять все/ }).click();
  await expect(sheet).toContainText("коммерческую тайну");

  // AI question with a verified citation.
  await ai.getByRole("tab", { name: "Спросить" }).click();
  await ai.getByRole("button", { name: "Какой максимальный испытательный срок?" }).click();
  await expect(ai.getByText("ст. 70 ТК РФ").first()).toBeVisible({ timeout: 20_000 });

  // Download DOCX.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Скачать .docx" }).first().click()]);
  expect(download.suggestedFilename()).toMatch(/\.docx$/);
  const path = await download.path();
  const fs = await import("node:fs");
  const bytes = fs.readFileSync(path!);
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
  await expect(page).toHaveURL(/doc=[0-9a-f-]{36}/);
  const docUrl = page.url();
  expect(docUrl).toMatch(/doc=[0-9a-f-]{36}/);
  const docId = new URL(docUrl).searchParams.get("doc")!;

  // Cabinet lists the document and the cards.
  await page.goto("/account");
  await expect(page.getByRole("link", { name: "Трудовой договор" }).first()).toBeVisible();
  await page.goto("/account/cards");
  await expect(page.getByRole("heading", { name: "ООО «Ромашка»" })).toBeVisible();

  // Another account cannot open this document.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/register");
  await otherPage.getByLabel("Почта").fill(`other-${email}`);
  await otherPage.getByLabel("Пароль").fill(password);
  await otherPage.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(otherPage).toHaveURL(/\/account/);
  const res = await otherPage.request.get(`/api/documents/${docId}`);
  expect(res.status()).toBe(404);
  await other.close();

  // Public AI chat on the landing shows the remaining-questions counter.
  await page.goto("/#ai");
  await expect(page.getByTestId("ai-quota")).toContainText(/Осталось \d+ из \d+/);
});
