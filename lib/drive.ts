import { google } from "googleapis";

const drive = google.drive({
  version: "v3",
  auth: new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive"],
  }),
});

export async function uploadToDrive({
  buffer,
  filename,
  mimeType,
}: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}) {
  const file = await drive.files.create({
    requestBody: { name: filename },
    media: { mimeType, body: buffer },
  });

  const fileId = file.data.id!;

  // make public
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    url: `https://drive.google.com/drive/folders/1WgLO09xY6mwCejHdmsgXx7FSC3AhPqON?usp=sharing${fileId}`,
  };
}
