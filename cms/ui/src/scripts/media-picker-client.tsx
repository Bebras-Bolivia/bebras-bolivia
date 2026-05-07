import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaFile = {
  filename: string;
  size: number;
  url: string;
};

declare global {
  interface Window {
    CMS_BASE_PATH?: string;
    CMSMediaPicker?: {
      open: () => Promise<string | null>;
    };
  }
}

function cmsUrl(path: string): string {
  const basePath = (window.CMS_BASE_PATH || "").replace(/\/$/, "");
  return `${basePath}${path}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaPickerModal({ onClose }: { onClose: (value: string | null) => void }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  const loadFiles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(cmsUrl("/api/media"));
      if (!res.ok) throw new Error("No se pudo cargar la galeria");
      const data = await res.json();
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err: any) {
      setError(err.message || "No se pudo cargar la galeria");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(null);
    };
    document.addEventListener("keydown", onEsc);
    document.body.classList.add("editor-modal-open");
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.classList.remove("editor-modal-open");
    };
  }, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(cmsUrl("/api/media/upload"), { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir el archivo");
      await loadFiles();
      onClose(data.url || cmsUrl(`/api/media/file/${data.filename}`));
    } catch (err: any) {
      setError(err.message || "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="editor-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <div className="editor-modal" style={{ maxWidth: "760px" }}>
        <div className="editor-modal-header">
          <h3>Seleccionar imagen</h3>
          <button type="button" className="editor-modal-close" onClick={() => onClose(null)}>
            x
          </button>
        </div>
        <p className="editor-modal-subtitle">Elige una imagen existente o sube una nueva.</p>

        <div style={{ marginBottom: "0.75rem" }}>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadFile(file);
              }
              e.currentTarget.value = "";
            }}
          />
          {uploading ? <div className="text-sm text-muted" style={{ marginTop: "0.5rem" }}>Subiendo...</div> : null}
        </div>

        {error ? <div className="text-sm" style={{ color: "var(--danger)", marginBottom: "0.75rem" }}>{error}</div> : null}

        <div className="editor-modal-list" style={{ maxHeight: "320px", overflowY: "auto" }}>
          {loading ? (
            <div className="text-sm text-muted">Cargando galeria...</div>
          ) : files.length === 0 ? (
            <div className="text-sm text-muted">No hay imagenes subidas.</div>
          ) : (
            files.map((file) => (
              <button
                key={file.filename}
                type="button"
                className="editor-modal-option"
                onClick={() => onClose(file.url)}
                style={{ textAlign: "left" }}
              >
                <span className="title">{file.filename}</span>
                <span className="desc">{formatSize(file.size)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

async function open(): Promise<string | null> {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const root = createRoot(mount);
  return new Promise((resolve) => {
    const done = (value: string | null) => {
      root.unmount();
      mount.remove();
      resolve(value);
    };
    root.render(<MediaPickerModal onClose={done} />);
  });
}

export function registerMediaPickerRenderer() {
  window.CMSMediaPicker = { open };
}
