import { expect, test, type Page } from "@playwright/test";

const studentEmail = process.env.E2E_STUDENT_EMAIL ?? "student@example.com";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.E2E_PASSWORD ?? "password";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test("student can browse assigned content, search, and open material", async ({ page }) => {
  await login(page, studentEmail);
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
  await login(page, studentEmail);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
});

test("admin can open CMS", async ({ page }) => {
  await login(page, adminEmail);
  await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Content" }).click();
  await expect(page.getByRole("heading", { name: "Syllabus content" })).toBeVisible();

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
  await page.getByRole("button", { name: "Import students" }).click();
  await expect(page.getByRole("heading", { name: "Import students" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download template" })).toHaveAttribute(
    "href",
    "/templates/student-batch-upload-template.xlsx"
  );
  await page.locator('input[type="file"]').setInputFiles("public/templates/student-batch-upload-template.xlsx");
  await page.getByRole("button", { name: "Start import" }).click();
  await expect(page.getByText("The workbook does not contain any student rows.")).toBeVisible();
});
