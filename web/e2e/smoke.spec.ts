import { expect, test } from "@playwright/test";

type Scenario = { number: number; title: string; expected: string; expected_review: boolean };

test("present mode walks every scenario with the expected outcome", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const scenarios: Scenario[] = await (await request.get("/api/scenarios")).json();

  await page.goto("/present?n=1");
  for (const s of scenarios) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(s.title);
    await expect(page.getByTestId("present-outcome")).toHaveText(s.expected);
    await expect(page.getByText("since this scenario was written")).toHaveCount(0);
    if (s.number < scenarios.length) await page.keyboard.press("ArrowRight");
  }
  expect(errors).toEqual([]);

  await page.goto("/audit");
  await expect(page.getByText(`${scenarios.length} records`)).toBeVisible();
});

test("every page loads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const pages: [string, RegExp][] = [
    ["/", /Data request/],
    ["/matrix", /Who sees what/],
    ["/policy", /Location groups/],
    ["/techniques", /place_check/],
    ["/audit", /Audit log/],
  ];
  for (const [path, text] of pages) {
    await page.goto(path);
    await expect(page.getByText(text).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("request builder runs a request and shows the result", async ({ page }) => {
  await page.goto("/?tier=5&requester=commercial&jurisdiction=uae&purpose=advertising&group=G5&area=Dubai");
  await expect(page.getByText("Masked").first()).toBeVisible();
  await page.getByRole("button", { name: "Run request" }).click();
  await expect(page.getByRole("heading", { name: "Result" })).toBeVisible();
  await page.getByRole("button", { name: /Released rows/ }).click();
  await expect(page.getByText(/^h_[0-9a-f]{16}$/).first()).toBeVisible();
});
