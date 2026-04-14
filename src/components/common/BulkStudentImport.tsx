import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────
interface ParsedRow {
  row: number;
  email: string;
  studentId?: string;
  fullName?: string;
  className?: string;
}

interface ValidationError {
  row: number;
  email: string;
  errors: string[];
}

interface ValidatedData {
  validRows: ParsedRow[];
  errorRows: ValidationError[];
}

type ImportState =
  | "idle"
  | "file-selected"
  | "validating"
  | "preview"
  | "importing"
  | "result";

interface ImportResult {
  success: { email: string; fullName: string; studentId: string | null; row: number }[];
  failed: { email: string; reason: string; row: number }[];
  provisioned: number;
  totalProcessed: number;
}

interface BulkStudentImportProps {
  courseId: string;
  onImportSuccess: () => void;
}

// ─── Column alias mapping ────────────────────────────────────────────
const COLUMN_ALIASES: Record<string, string> = {
  email: "email",
  "e-mail": "email",
  "email address": "email",
  "địa chỉ email": "email",
  studentid: "studentId",
  student_id: "studentId",
  "student id": "studentId",
  "mã sinh viên": "studentId",
  mssv: "studentId",
  "ma sv": "studentId",
  fullname: "fullName",
  full_name: "fullName",
  "full name": "fullName",
  name: "fullName",
  "họ và tên": "fullName",
  "ho ten": "fullName",
  "họ tên": "fullName",
  classname: "className",
  class_name: "className",
  "class name": "className",
  class: "className",
  lớp: "className",
  "tên lớp": "className",
};

function normalizeColumnName(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");
  return COLUMN_ALIASES[key] || null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Component ───────────────────────────────────────────────────────
export function BulkStudentImport({ courseId, onImportSuccess }: BulkStudentImportProps) {
  const [state, setState] = useState<ImportState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [validated, setValidated] = useState<ValidatedData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showValidRows, setShowValidRows] = useState(false);
  const [showErrorRows, setShowErrorRows] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── File handling ──────────────────────────────────────────────
  const processFile = useCallback((selectedFile: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(selectedFile.type) && !["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Unsupported file format. Please use CSV or Excel (.xlsx, .xls).");
      return;
    }
    setFile(selectedFile);
    setState("file-selected");
    setValidated(null);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) processFile(droppedFile);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setState("idle");
    setValidated(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ─── Parse & Validate ───────────────────────────────────────────
  const parseAndValidate = useCallback(async () => {
    if (!file) return;
    setState("validating");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (rawData.length === 0) {
        toast.error("File is empty.");
        setState("file-selected");
        return;
      }

      // Find header row (first row with recognizable columns)
      const headerRow = rawData[0] as string[];
      const columnMap: Record<string, number> = {};

      headerRow.forEach((cell, idx) => {
        const normalized = normalizeColumnName(String(cell || ""));
        if (normalized && !(normalized in columnMap)) {
          columnMap[normalized] = idx;
        }
      });

      if (!("email" in columnMap)) {
        // Fallback: if no header recognized, treat first column as email
        // Check if first row looks like data rather than headers
        const firstCellLooksLikeEmail = EMAIL_REGEX.test(String(headerRow[0] || ""));
        if (firstCellLooksLikeEmail) {
          columnMap["email"] = 0;
          if (headerRow.length > 1) columnMap["studentId"] = 1;
          if (headerRow.length > 2) columnMap["fullName"] = 2;
          if (headerRow.length > 3) columnMap["className"] = 3;
          // Re-include first row as data
          rawData.unshift([]); // shift index so data starts at 1
        } else {
          toast.error("Could not find 'Email' column in file. Please check column headers.");
          setState("file-selected");
          return;
        }
      }

      const parsedRows: ParsedRow[] = [];
      const errorRows: ValidationError[] = [];
      const emailsSeen = new Map<string, number>(); // email → first row number

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.every((cell: any) => !String(cell || "").trim())) continue; // skip empty rows

        const email = String(row[columnMap["email"]] || "").trim().toLowerCase();
        const studentId = columnMap["studentId"] !== undefined
          ? String(row[columnMap["studentId"]] || "").trim()
          : undefined;
        const fullName = columnMap["fullName"] !== undefined
          ? String(row[columnMap["fullName"]] || "").trim()
          : undefined;
        const className = columnMap["className"] !== undefined
          ? String(row[columnMap["className"]] || "").trim()
          : undefined;

        const rowErrors: string[] = [];

        // Validate email
        if (!email) {
          rowErrors.push("Email is required");
        } else if (!EMAIL_REGEX.test(email)) {
          rowErrors.push(`Invalid email format: "${email}"`);
        } else if (emailsSeen.has(email)) {
          rowErrors.push(`Duplicate email (same as row ${emailsSeen.get(email)})`);
        }

        if (rowErrors.length > 0) {
          errorRows.push({ row: i, email: email || "(empty)", errors: rowErrors });
        } else {
          emailsSeen.set(email, i);
          parsedRows.push({
            row: i,
            email,
            studentId: studentId || undefined,
            fullName: fullName || undefined,
            className: className || undefined,
          });
        }
      }

      if (parsedRows.length === 0 && errorRows.length === 0) {
        toast.error("No data rows found in file.");
        setState("file-selected");
        return;
      }

      setValidated({ validRows: parsedRows, errorRows });
      setState("preview");
    } catch (err: any) {
      console.error("Parse error:", err);
      toast.error("Failed to parse file: " + (err?.message || "Unknown error"));
      setState("file-selected");
    }
  }, [file]);

  // ─── Import ─────────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!validated || validated.validRows.length === 0) return;
    setState("importing");

    try {
      const importResult = await api.bulkImportStudents(
        courseId,
        validated.validRows.map((r) => ({
          email: r.email,
          studentId: r.studentId,
          fullName: r.fullName,
          className: r.className,
        })),
      );

      setResult(importResult);
      setState("result");

      if (importResult.success.length > 0) {
        onImportSuccess();
      }
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error("Import failed: " + (err?.message || "Unknown error"));
      setState("preview");
    }
  }, [validated, courseId, onImportSuccess]);

  // ─── Download Sample ─────────────────────────────────────────────
  const downloadSample = useCallback(() => {
    const sampleData = [
      ["email", "studentId", "fullName", "className"],
      ["student1@university.edu", "SV001", "Nguyen Van A", "CNTT-01"],
      ["student2@university.edu", "SV002", "Tran Thi B", "CNTT-01"],
      ["student3@university.edu", "SV003", "Le Van C", "CNTT-02"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    
    // Auto-size columns for better readability in Excel
    ws["!cols"] = [
      { wch: 30 }, // email
      { wch: 15 }, // studentId
      { wch: 25 }, // fullName
      { wch: 15 }, // className
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_import_template.xlsx");
    toast.success("Template downloaded successfully");
  }, []);

  // ─── Render: Idle / File selected ──────────────────────────────
  if (state === "idle" || state === "file-selected") {
    return (
      <div className="space-y-4">
        {/* Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : file
                ? "border-green-400 bg-green-50/50 dark:bg-green-950/20"
                : "border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/40"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          {file ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-muted/60 mb-3">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Drag & drop file here
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Supports CSV, Excel (.xlsx, .xls)
              </p>
              <Button variant="secondary" size="sm" className="relative">
                Browse File
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
            }}
          />
        </div>

        {/* Template download & format info */}
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs text-muted-foreground space-y-1.5 flex-1">
            <p className="font-medium text-foreground/80">Supported columns:</p>
            <div className="flex flex-wrap gap-1.5">
              {["email *", "studentId", "fullName", "className"].map((col) => (
                <code
                  key={col}
                  className={`px-1.5 py-0.5 rounded text-[11px] ${
                    col.includes("*")
                      ? "bg-primary/10 text-primary font-semibold"
                      : "bg-muted"
                  }`}
                >
                  {col}
                </code>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={downloadSample}
          >
            <Download className="h-3.5 w-3.5" />
            Template
          </Button>
        </div>

        {/* Validate button */}
        {file && (
          <Button
            onClick={parseAndValidate}
            className="w-full gap-2"
            disabled={state === "validating"}
          >
            {state === "validating" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Validating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" /> Validate & Preview
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // ─── Render: Validating ────────────────────────────────────────
  if (state === "validating") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Parsing and validating file...</p>
      </div>
    );
  }

  // ─── Render: Preview ───────────────────────────────────────────
  if (state === "preview" && validated) {
    const { validRows, errorRows } = validated;

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">
                {validRows.length}
              </p>
              <p className="text-xs text-green-600/80 dark:text-green-400/60">
                Valid rows
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            errorRows.length > 0
              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
              : "bg-muted/30 border-muted"
          }`}>
            {errorRows.length > 0 ? (
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div>
              <p className={`text-lg font-bold ${
                errorRows.length > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              }`}>
                {errorRows.length}
              </p>
              <p className={`text-xs ${
                errorRows.length > 0
                  ? "text-red-500/80 dark:text-red-400/60"
                  : "text-muted-foreground/60"
              }`}>
                Error rows
              </p>
            </div>
          </div>
        </div>

        {/* Error rows detail */}
        {errorRows.length > 0 && (
          <div className="border rounded-lg border-red-200 dark:border-red-900/40 overflow-hidden">
            <button
              onClick={() => setShowErrorRows(!showErrorRows)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  {errorRows.length} error(s) found
                </span>
              </div>
              {showErrorRows ? (
                <ChevronUp className="h-4 w-4 text-red-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-red-400" />
              )}
            </button>
            {showErrorRows && (
              <div className="max-h-[250px] overflow-y-auto relative w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50/50 sticky top-0 z-10 shadow-sm">
                      <TableHead className="w-16 text-xs bg-red-50/50 dark:bg-red-950/10">Row</TableHead>
                      <TableHead className="text-xs bg-red-50/50 dark:bg-red-950/10">Email</TableHead>
                      <TableHead className="text-xs bg-red-50/50 dark:bg-red-950/10">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorRows.map((err, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-mono text-red-600 dark:text-red-400">
                          {err.row}
                        </TableCell>
                        <TableCell className="font-mono max-w-[160px] truncate">
                          {err.email}
                        </TableCell>
                        <TableCell className="text-red-600 dark:text-red-400">
                          {err.errors.join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Valid rows preview */}
        {validRows.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowValidRows(!showValidRows)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {validRows.length} valid row(s) ready to import
                </span>
              </div>
              {showValidRows ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showValidRows && (
              <div className="max-h-[250px] overflow-y-auto relative w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent sticky top-0 z-10 bg-background shadow-sm">
                      <TableHead className="w-16 text-xs bg-background">Row</TableHead>
                      <TableHead className="text-xs bg-background">Email</TableHead>
                      <TableHead className="text-xs bg-background">Student ID</TableHead>
                      <TableHead className="text-xs bg-background">Full Name</TableHead>
                      <TableHead className="text-xs bg-background">Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validRows.map((row) => (
                      <TableRow key={row.row} className="text-xs">
                        <TableCell className="font-mono">{row.row}</TableCell>
                        <TableCell className="font-mono max-w-[160px] truncate">
                          {row.email}
                        </TableCell>
                        <TableCell>{row.studentId || "—"}</TableCell>
                        <TableCell>{row.fullName || "—"}</TableCell>
                        <TableCell>{row.className || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={clearFile}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={validRows.length === 0}
            onClick={handleImport}
          >
            <Upload className="h-4 w-4" />
            Import {validRows.length} Student(s)
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render: Importing ─────────────────────────────────────────
  if (state === "importing") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Importing students...</p>
        <p className="text-xs text-muted-foreground/60">
          This may take a moment for large files
        </p>
      </div>
    );
  }

  // ─── Render: Result ────────────────────────────────────────────
  if (state === "result" && result) {
    return (
      <div className="space-y-4">
        {/* Result summary */}
        <div className={`p-4 rounded-xl border ${
          result.success.length > 0 && result.failed.length === 0
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40"
            : result.success.length > 0
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
        }`}>
          <div className="flex items-start gap-3">
            {result.success.length > 0 && result.failed.length === 0 ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
            ) : result.success.length > 0 ? (
              <AlertTriangle className="h-6 w-6 text-amber-500 mt-0.5" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                {result.success.length > 0 && result.failed.length === 0
                  ? "Import completed successfully!"
                  : result.success.length > 0
                    ? "Import completed with some issues"
                    : "Import failed"}
              </p>
              <div className="text-xs space-y-0.5 text-muted-foreground">
                <p>✅ <strong>{result.success.length}</strong> student(s) imported successfully</p>
                {result.failed.length > 0 && (
                  <p>❌ <strong>{result.failed.length}</strong> row(s) skipped</p>
                )}
                {result.provisioned > 0 && (
                  <p>🆕 <strong>{result.provisioned}</strong> new account(s) auto-created</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Server-side failures */}
        {result.failed.length > 0 && (
          <div className="border rounded-lg border-red-200 dark:border-red-900/40 overflow-hidden">
            <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  Skipped rows
                </span>
              </div>
            </div>
            <div className="max-h-[250px] overflow-y-auto relative w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50/50 sticky top-0 z-10 shadow-sm">
                    <TableHead className="w-16 text-xs bg-red-50/50 dark:bg-red-950/10">Row</TableHead>
                    <TableHead className="text-xs bg-red-50/50 dark:bg-red-950/10">Email</TableHead>
                    <TableHead className="text-xs bg-red-50/50 dark:bg-red-950/10">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.failed.map((f, idx) => (
                    <TableRow key={idx} className="text-xs">
                      <TableCell className="font-mono text-red-600 dark:text-red-400">
                        {f.row}
                      </TableCell>
                      <TableCell className="font-mono max-w-[160px] truncate">
                        {f.email}
                      </TableCell>
                      <TableCell className="text-red-600 dark:text-red-400">
                        {f.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Done button */}
        <Button
          className="w-full"
          onClick={clearFile}
        >
          Done
        </Button>
      </div>
    );
  }

  return null;
}
