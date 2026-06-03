"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { importStudentsBatchAction } from "@/features/admin/actions";
import {
  prepareStudentImportRows,
  studentImportBatchSize,
  studentImportHeaders,
  validateStudentImportHeaders,
  type RawStudentImportRow,
  type StudentImportResult
} from "@/features/admin/student-import";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ImportProgress = {
  processed: number;
  total: number;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The workbook could not be imported.";
}

export function StudentImportDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [results, setResults] = useState<StudentImportResult[]>([]);

  const importedCount = results.filter((result) => result.status === "imported").length;
  const skippedCount = results.filter((result) => result.status === "skipped").length;

  function resetResults() {
    setIsComplete(false);
    setError(null);
    setProgress(null);
    setResults([]);
  }

  async function importWorkbook() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Select an .xlsx file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Only .xlsx files are accepted.");
      return;
    }

    setIsImporting(true);
    resetResults();

    try {
      const { readSheet } = await import("read-excel-file/browser");
      const workbookRows = await readSheet(file);
      if (workbookRows.length === 0) {
        throw new Error("The workbook does not contain any rows.");
      }

      const headerError = validateStudentImportHeaders(workbookRows[0]);
      if (headerError) {
        throw new Error(headerError);
      }

      const rawRows: RawStudentImportRow[] = workbookRows.slice(1).map((values, index) => ({
        rowNumber: index + 2,
        values: values.slice(0, studentImportHeaders.length)
      }));

      const { validRows, skippedRows } = prepareStudentImportRows(rawRows);
      const total = validRows.length + skippedRows.length;
      let processed = skippedRows.length;
      let combinedResults = [...skippedRows];

      if (total === 0) {
        throw new Error("The workbook does not contain any student rows.");
      }

      setResults(combinedResults);
      setProgress({ processed, total });

      for (let index = 0; index < validRows.length; index += studentImportBatchSize) {
        const batch = validRows.slice(index, index + studentImportBatchSize);
        const response = await importStudentsBatchAction(batch);
        combinedResults = [...combinedResults, ...response.results].sort((a, b) => a.rowNumber - b.rowNumber);
        processed += response.results.length;
        setResults(combinedResults);
        setProgress({ processed, total });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsComplete(true);
      router.refresh();
    } catch (importError) {
      setError(errorMessage(importError));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <Upload className="size-4" />
            Import students
          </Button>
        }
      />
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import students</DialogTitle>
          <DialogDescription>
            Create student accounts from the first worksheet of an Excel workbook. Existing emails and invalid rows are skipped, and no group or content access is
            assigned.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 size-5 text-primary" />
              <div className="grid gap-2 text-sm">
                <p className="font-medium">Use the provided .xlsx template</p>
                <p className="text-muted-foreground">
                  Keep the required columns unchanged. Phone and Guardian Name values are optional. New students must change their temporary password after login.
                </p>
                <a
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
                  href="/templates/student-batch-upload-template.xlsx"
                  download
                >
                  <Download className="size-3.5" />
                  Download template
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={isImporting}
              onChange={resetResults}
            />
            <Button type="button" disabled={isImporting} onClick={importWorkbook}>
              {isImporting ? "Importing students..." : "Start import"}
            </Button>
          </div>

          {error ? <Alert variant="destructive">{error}</Alert> : null}

          {progress ? (
            <Alert>
              {isImporting
                ? `Processed ${progress.processed} of ${progress.total} rows. Keep this dialog open until the import completes.`
                : isComplete
                  ? `Import complete: ${importedCount} imported, ${skippedCount} skipped.`
                  : `Import stopped after ${progress.processed} of ${progress.total} rows.`}
            </Alert>
          ) : null}

          {results.length > 0 ? (
            <div className="max-h-72 overflow-auto rounded-lg border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={`${result.rowNumber}-${result.email}-${result.status}`}>
                      <TableCell>{result.rowNumber}</TableCell>
                      <TableCell>{result.email || "Blank email"}</TableCell>
                      <TableCell className="capitalize">{result.status}</TableCell>
                      <TableCell className="text-muted-foreground">{result.reason ?? "Created successfully."}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
