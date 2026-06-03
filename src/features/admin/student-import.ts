import { z } from "zod";

export const studentImportHeaders = ["Name", "Email", "Temporary Password", "Phone", "Guardian Name"] as const;
export const studentImportBatchSize = 20;

const optionalTextSchema = z.string().trim().optional().default("");

export const studentAccountInputSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Email is invalid.").transform((email) => email.toLowerCase()),
  password: z.string().min(8, "Temporary password must be at least 8 characters."),
  phone: optionalTextSchema,
  guardian_name: optionalTextSchema,
  notes: optionalTextSchema
});

export const studentImportRowInputSchema = studentAccountInputSchema.omit({ notes: true }).extend({
  rowNumber: z.number().int().min(2)
});

export type StudentAccountInput = z.infer<typeof studentAccountInputSchema>;
export type StudentImportRowInput = z.infer<typeof studentImportRowInputSchema>;

export type StudentImportResult = {
  rowNumber: number;
  email: string;
  status: "imported" | "skipped";
  reason?: string;
};

export type RawStudentImportRow = {
  rowNumber: number;
  values: unknown[];
};

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function trimTrailingBlankHeaders(headers: string[]) {
  const normalized = [...headers];
  while (normalized.at(-1) === "") normalized.pop();
  return normalized;
}

export function validateStudentImportHeaders(values: unknown[]) {
  const headers = trimTrailingBlankHeaders(values.map((value) => cellText(value).trim()));
  const matches =
    headers.length === studentImportHeaders.length &&
    studentImportHeaders.every((expected, index) => headers[index] === expected);

  return matches ? null : `The first row must contain exactly: ${studentImportHeaders.join(", ")}.`;
}

export function prepareStudentImportRows(rows: RawStudentImportRow[]) {
  const validRows: StudentImportRowInput[] = [];
  const skippedRows: StudentImportResult[] = [];
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const [full_name = "", email = "", password = "", phone = "", guardian_name = ""] = row.values.map(cellText);
    const displayEmail = email.trim().toLowerCase();

    if ([full_name, email, password, phone, guardian_name].every((value) => value.trim().length === 0)) {
      continue;
    }

    const parsed = studentImportRowInputSchema.safeParse({
      rowNumber: row.rowNumber,
      full_name,
      email,
      password,
      phone,
      guardian_name
    });

    if (!parsed.success) {
      skippedRows.push({
        rowNumber: row.rowNumber,
        email: displayEmail,
        status: "skipped",
        reason: parsed.error.issues[0]?.message ?? "Row is invalid."
      });
      continue;
    }

    if (seenEmails.has(parsed.data.email)) {
      skippedRows.push({
        rowNumber: row.rowNumber,
        email: parsed.data.email,
        status: "skipped",
        reason: "Duplicate email in workbook."
      });
      continue;
    }

    seenEmails.add(parsed.data.email);
    validRows.push(parsed.data);
  }

  return { validRows, skippedRows };
}

export function studentCreatedAuditData(input: StudentAccountInput) {
  return {
    email: input.email,
    full_name: input.full_name,
    guardian_name: input.guardian_name || null,
    phone: input.phone || null,
    notes: input.notes || null,
    role: "student",
    must_change_password: true
  };
}
