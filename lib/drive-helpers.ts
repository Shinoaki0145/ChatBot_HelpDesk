
export async function readDriveFile(fileId: string): Promise<string> {
  const res = await fetch("/api/read-drive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.text;
}

export function getFileIdFromUrl(url: string): string | null {
  if (!url) return null;

  // Cập nhật regex: thêm ký tự "_" vào trong ngoặc vuông
  // Standard format: /d/FILEID/view
  const standardMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)\//);
  if (standardMatch && standardMatch[1]) return standardMatch[1];

  // Cập nhật regex cho trường hợp này luôn để an toàn
  // Open ID format: ?id=FILEID
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (queryMatch && queryMatch[1]) return queryMatch[1];

  return null;
}