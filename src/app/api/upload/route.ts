import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { ca } from "zod/v4/locales";
import { success } from "zod";
import { FieldPath } from "firebase/firestore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("🔥 UPLOAD ROUTE LOADED");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()),
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: file.name,
      parents: [process.env.SHARED_DRIVE_ID || ""],
    };

    const media = {
      mimeType: file.type,
      body: Readable.fromWeb(file.stream() as any),
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      link: response.data.webViewLink,
    });
  }catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
