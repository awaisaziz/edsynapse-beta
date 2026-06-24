/**
 * Extract plain text from uploaded source material.
 * Supports PDF, DOCX, XLSX, and plain text/markdown. SERVER ONLY.
 */

export type SupportedFileType = "pdf" | "docx" | "xlsx" | "text";

export function detectFileType(filename: string, mime?: string): SupportedFileType {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (lower.endsWith(".docx") || mime?.includes("wordprocessingml")) return "docx";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || mime?.includes("spreadsheetml")) return "xlsx";
  return "text";
}

export async function extractText(
  buffer: Buffer,
  type: SupportedFileType,
): Promise<string> {
  switch (type) {
    case "pdf": {
      const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await pdfExtract(pdf, { mergePages: true });
      return Array.isArray(text) ? text.join("\n") : text;
    }
    case "docx": {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }
    case "xlsx": {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const parts: string[] = [];
      for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        parts.push(`# Sheet: ${name}\n${csv}`);
      }
      return parts.join("\n\n");
    }
    case "text":
    default:
      return buffer.toString("utf8");
  }
}
