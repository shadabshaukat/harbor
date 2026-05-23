"use client";

import { useRef, useState } from "react";

type Props = {
  itemId: string;
  itemName: string;
};

export function MenuImageUploader({ itemId, itemName }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/menu-items/${itemId}/image`, {
      method: "POST",
      body: formData
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload.error ?? "Upload failed");
      setBusy(false);
      return;
    }

    setStatus("Image updated");
    setBusy(false);
    window.location.reload();
  }

  return (
    <div className="upload-row">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void upload(file);
          }
        }}
      />
      <button
        type="button"
        className="btn ghost compact-btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label={`Upload image for ${itemName}`}
      >
        {busy ? "Uploading" : "Upload image"}
      </button>
      {status ? <span className="upload-status">{status}</span> : null}
    </div>
  );
}
