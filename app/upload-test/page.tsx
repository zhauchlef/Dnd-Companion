
"use client";

import { useState } from "react";
import { uploadMap } from "@/lib/mapStorage";

export default function UploadTest() {
  const [status, setStatus] = useState("");

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setStatus("File is larger than 50 MB!");
      return;
    }

    try {
      setStatus("Uploading map...");
      const result = await uploadMap(file);

      setStatus(`Uploaded successfully: ${result.name}`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Upload failed"
      );
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>D&D Map Upload Test</h1>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleUpload}
      />
      <p>{status}</p>
    </main>
  );
}
