import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test("student can browse assigned content, search, and open material", async ({ page }) => {
  await login(page, "student@example.com");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByText("Mathematics").click();
  await expect(page.getByRole("heading", { name: "Mathematics" })).toBeVisible();
  await page.getByText("Linear Equations").click();
  await expect(page.getByRole("heading", { name: "Linear Equations" })).toBeVisible();
  await page.getByText("Solving 2x + 5 = 17").click();
  await expect(page.getByRole("heading", { name: "Solving 2x + 5 = 17" })).toBeVisible();
  await page.goto("/search?q=equations");
  await expect(page.getByRole("link", { name: "Linear Equations", exact: true })).toBeVisible();
  await page.goto("/materials/70000000-0000-4000-8000-000000000001");
  await expect(page.getByRole("heading", { name: "Linear Equations Solution Sheet" })).toBeVisible();
});

test("student cannot access admin", async ({ page }) => {
  await login(page, "student@example.com");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
});

test("admin can open CMS", async ({ page }) => {
  await login(page, "admin@example.com");
  await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Content" }).click();
  await expect(page.getByRole("heading", { name: "Syllabus content" })).toBeVisible();
});
