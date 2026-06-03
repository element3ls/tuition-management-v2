import { describe, expect, it } from "vitest";
import { getAuthenticatedHomePath } from "@/lib/auth/redirects";

describe("authenticated home redirect", () => {
  it("sends users who must change their password to account settings", () => {
    expect(getAuthenticatedHomePath({ must_change_password: true }, ["student"])).toBe("/account?passwordChange=required");
  });

  it("sends students to the dashboard", () => {
    expect(getAuthenticatedHomePath({ must_change_password: false }, ["student"])).toBe("/dashboard");
  });

  it("sends admins to the admin area", () => {
    expect(getAuthenticatedHomePath({ must_change_password: false }, ["admin"])).toBe("/admin");
  });
});
