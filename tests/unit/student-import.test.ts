import { describe, expect, it } from "vitest";
import {
  prepareStudentImportRows,
  studentImportHeaders,
  validateStudentImportHeaders
} from "@/features/admin/student-import";

describe("student import workbook validation", () => {
  it("accepts the exact template headers", () => {
    expect(validateStudentImportHeaders([...studentImportHeaders])).toBeNull();
  });

  it("rejects missing, reordered, and extra headers", () => {
    expect(validateStudentImportHeaders(["Name", "Email", "Temporary Password", "Phone"])).toContain("exactly");
    expect(validateStudentImportHeaders(["Email", "Name", "Temporary Password", "Phone", "Guardian Name"])).toContain("exactly");
    expect(validateStudentImportHeaders([...studentImportHeaders, "Group"])).toContain("exactly");
  });

  it("accepts blank optional phone and guardian values", () => {
    const result = prepareStudentImportRows([
      {
        rowNumber: 2,
        values: ["Ada Student", "ADA@EXAMPLE.COM", "password123", "", ""]
      }
    ]);

    expect(result.skippedRows).toEqual([]);
    expect(result.validRows).toEqual([
      {
        rowNumber: 2,
        full_name: "Ada Student",
        email: "ada@example.com",
        password: "password123",
        phone: "",
        guardian_name: ""
      }
    ]);
  });

  it("ignores blank rows and skips invalid rows", () => {
    const result = prepareStudentImportRows([
      { rowNumber: 2, values: ["", "", "", "", ""] },
      { rowNumber: 3, values: ["Missing Email", "", "password123", "", ""] },
      { rowNumber: 4, values: ["Short Password", "short@example.com", "short", "", ""] }
    ]);

    expect(result.validRows).toEqual([]);
    expect(result.skippedRows).toEqual([
      {
        rowNumber: 3,
        email: "",
        status: "skipped",
        reason: "Email is invalid."
      },
      {
        rowNumber: 4,
        email: "short@example.com",
        status: "skipped",
        reason: "Temporary password must be at least 8 characters."
      }
    ]);
  });

  it("skips later duplicate emails case-insensitively", () => {
    const result = prepareStudentImportRows([
      { rowNumber: 2, values: ["First Student", "student@example.com", "password123", "", ""] },
      { rowNumber: 3, values: ["Second Student", "STUDENT@example.com", "password456", "", ""] }
    ]);

    expect(result.validRows).toHaveLength(1);
    expect(result.skippedRows).toEqual([
      {
        rowNumber: 3,
        email: "student@example.com",
        status: "skipped",
        reason: "Duplicate email in workbook."
      }
    ]);
  });
});
