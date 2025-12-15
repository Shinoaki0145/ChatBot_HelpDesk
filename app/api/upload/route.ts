// app/api/upload/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";

/**
 * Upload route (App Router)
 * - Accepts multipart/form-data (field name="file")
 * - Saves file to public/uploads
 * - Extracts text for .txt, .docx, .pdf
 * - Returns { url: "/uploads/xxx.ext", text: "extracted text" }
 *
 * NOTE: This writes to local disk. For serverless (Vercel) use S3/GCS instead.
 */

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded (field name must be 'file')" },
        { status: 400 }
      );
    }

    // Convert File -> Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare uploads directory under public
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Make safe filename: timestamp-original
    const safeName = `${Date.now()}-${(file.name || "upload").replace(/\s+/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);

    // Save to disk
    fs.writeFileSync(filePath, buffer);

    // Try to extract text based on extension
    const lower = (file.name || "").toLowerCase();
    let extractedText = "";

    if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv")) {
      // plain text
      extractedText = buffer.toString("utf-8");
    } else if (lower.endsWith(".docx")) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        // mammoth.extractRawText may return string or object depending on version
        if (typeof result === "string") extractedText = result;
        else if ((result as any).value) extractedText = (result as any).value;
        else extractedText = String(result);
      } catch (e) {
        console.error("DOCX parse error:", e);
        extractedText = "";
      }
    } else if (lower.endsWith(".pdf")) {
      try {
        // dynamic import to avoid "no default export" / ESM/CJS mismatch
        const pdfModule = await import("pdf-parse");
        const pdfParse = (pdfModule as any).default ?? pdfModule;
        const data = await pdfParse(buffer);
        extractedText = data?.text || "";
      } catch (e) {
        console.error("PDF parse error:", e);
        extractedText = "";
      }
    } else {
      // Unknown extension — attempt to decode as utf-8 text
      try {
        extractedText = buffer.toString("utf-8");
      } catch (e) {
        extractedText = "";
      }
    }

    const url = `/uploads/${encodeURIComponent(safeName)}`;

    return NextResponse.json({ url, text: extractedText });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}
