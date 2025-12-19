import { NextResponse } from "next/server";
import { google } from "googleapis";
import * as mammoth from "mammoth";
import { PDFParse } from 'pdf-parse';

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: "No fileId provided" }, { status: 400 });
    }

    // 1. Initialize Google Drive with Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "", "base64").toString()
      ),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });

    // 2. Fetch file metadata to determine MIME type
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: "mimeType, name",
      supportsAllDrives: true,
    });

    const mimeType = metadata.data.mimeType;

    // 3. Fetch file content as a Buffer
    const response = await drive.files.get(
      { fileId: fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    let extractedText = "";

    // 4. Branching logic based on File Type
    if (mimeType === "application/pdf") {
      // New v2 Usage: Initialize class with buffer
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        extractedText = result.text;
      } finally {
        // Crucial: Always destroy to free memory
        await parser.destroy();
      }
    } 
    else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const docxData = await mammoth.extractRawText({ buffer });
      extractedText = docxData.value;
    } 
    else {
      // text/plain or fallback
      extractedText = buffer.toString("utf-8");
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: metadata.data.name,
    });

  } catch (error: any) {
    console.error("❌ READ DRIVE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document" },
      { status: 500 }
    );
  }
}