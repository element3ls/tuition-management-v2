import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import ExcelJS from "exceljs";

const outputPath = join(process.cwd(), "public", "templates", "student-batch-upload-template.xlsx");
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Students", {
  views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
});

worksheet.columns = [
  { header: "Name", key: "name", width: 28, style: { numFmt: "@" } },
  { header: "Email", key: "email", width: 34, style: { numFmt: "@" } },
  { header: "Temporary Password", key: "temporaryPassword", width: 24, style: { numFmt: "@" } },
  { header: "Phone", key: "phone", width: 20, style: { numFmt: "@" } },
  { header: "Guardian Name", key: "guardianName", width: 28, style: { numFmt: "@" } }
];

worksheet.autoFilter = "A1:E1";
worksheet.getRow(1).height = 26;
worksheet.getRow(1).eachCell((cell) => {
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.border = {
    top: { style: "thin", color: { argb: "FFBFDBFE" } },
    left: { style: "thin", color: { argb: "FFBFDBFE" } },
    bottom: { style: "thin", color: { argb: "FFBFDBFE" } },
    right: { style: "thin", color: { argb: "FFBFDBFE" } }
  };
});

worksheet.pageSetup = {
  orientation: "landscape",
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0
};

await mkdir(dirname(outputPath), { recursive: true });
await workbook.xlsx.writeFile(outputPath);
console.log(`Wrote ${outputPath}`);
