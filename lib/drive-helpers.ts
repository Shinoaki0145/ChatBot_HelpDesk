
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