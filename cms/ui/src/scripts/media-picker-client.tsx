import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaFile = {
  filename: string;
  size: number;
  url: string;
};

type ImageInsertResult = {
  markdown: string;
  url: string;
};

declare global {
  interface Window {
    CMS_BASE_PATH?: string;
    CMSMediaPicker?: {
      open: () => Promise<string | null>;
      openForMarkdown: () => Promise<ImageInsertResult | null>;
    };
    CMSModal?: {
      openConfirm: (payload: {
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        tone?: "danger" | "default";
      }) => Promise<boolean>;
    };
  }
}

function cmsUrl(path: string): string {
  const basePath = (window.CMS_BASE_PATH || "").replace(/\/$/, "");
  return `${basePath}${path}`;
}

function displayFilename(filename: string): string {
  return filename.replace(/^\d+-/, "");
}

function MediaPickerModal({ onClose, markdownMode = false }: { onClose: (value: string | ImageInsertResult | null) => void; markdownMode?: boolean }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [pendingUploadedFile, setPendingUploadedFile] = useState<MediaFile | null>(null);
  const [altText, setAltText] = useState("Imagen");
  const [size, setSize] = useState<"sm" | "md" | "lg" | "full">("full");
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  const isWizard = markdownMode;
  const currentStep = !isWizard ? 1 : wizardStep;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose is stable from parent
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
      const created = {
        filename: data.filename,
        size: file.size,
        url: data.url || cmsUrl(`/api/media/file/${data.filename}`),
      } satisfies MediaFile;

      if (!markdownMode) {
        onClose(created.url);
        return;
      }

      setPendingUploadedFile(created);
      setSelectedFile(created);
      setAltText(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
      setWizardStep(2);
    } catch (err: any) {
      setError(err.message || "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    const accepted = await window.CMSModal?.openConfirm?.({
      title: "Eliminar imagen",
      message: `Esta accion eliminara ${filename} de la galeria del CMS.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!accepted) return;

    setDeleting(filename);
    setError("");
    try {
      const res = await fetch(cmsUrl(`/api/media/${encodeURIComponent(filename)}`), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar el archivo");
      await loadFiles();
    } catch (err: any) {
      setError(err.message || "No se pudo eliminar el archivo");
    } finally {
      setDeleting(null);
    }
  };

  const completeMarkdownInsert = () => {
    if (!selectedFile) return;
    const cleanAlt = (altText || "Imagen").trim() || "Imagen";
    const sizeSuffix = size === "full" ? "" : `|${size}`;
    onClose({
      markdown: `![${cleanAlt}${sizeSuffix}](${selectedFile.url})`,
      url: selectedFile.url,
    });
  };

  const resetWizard = () => {
    setSelectedFile(null);
    setPendingUploadedFile(null);
    setAltText("Imagen");
    setSize("full");
    setWizardStep(1);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div className={`editor-modal-overlay${markdownMode ? " editor-modal-overlay-center" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <div className="editor-modal" style={{ maxWidth: "760px" }}>
        <div className="editor-modal-header">
          <h3>{markdownMode ? "Insertar imagen" : "Seleccionar imagen"}</h3>
          <button type="button" className="editor-modal-close" onClick={() => onClose(null)}>
            x
          </button>
        </div>
        {!markdownMode ? <p className="editor-modal-subtitle">Elige una imagen existente o sube una nueva.</p> : null}

        {markdownMode ? (
          <div className="media-stepper" aria-label="Pasos para insertar imagen">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`media-step${currentStep > step ? " is-complete" : ""}${currentStep >= step ? " is-active" : ""}${currentStep === step ? " is-current" : ""}`}>
                <span className="media-step-num">{step}</span>
              </div>
            ))}
          </div>
        ) : null}

        {(!markdownMode || currentStep === 1) ? (
          <div
            className={`media-dropzone${dragActive ? " is-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
          >
            <div className="media-dropzone-copy">
              <strong>{uploading ? "Subiendo imagen..." : "Arrastra una imagen aquí"}</strong>
              <span>o elige un archivo desde tu computadora</span>
            </div>
            <label className="btn btn-ghost btn-sm media-dropzone-button">
              Seleccionar archivo
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadFile(file);
                  }
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        ) : null}

        {error ? <div className="text-sm" style={{ color: "var(--danger)", marginBottom: "0.75rem" }}>{error}</div> : null}

        {markdownMode && selectedFile && currentStep === 2 ? (
          <div className="media-wizard-panel">
            <div className="media-wizard-preview">
              <img src={selectedFile.url} alt={displayFilename(selectedFile.filename)} className="media-card-thumb" />
            </div>
            <div className="form-group">
              <label htmlFor="media-alt-text">Nombre visible / alt</label>
              <input id="media-alt-text" className="form-input" value={altText} onChange={(e) => setAltText(e.target.value)} />
            </div>
            <div className="media-wizard-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetWizard}>
                Cambiar imagen
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setWizardStep(3)}>
                Continuar
              </button>
            </div>
          </div>
        ) : null}

        {markdownMode && selectedFile && currentStep === 3 ? (
          <div className="media-wizard-panel">
            <div className="media-wizard-preview">
              <img src={selectedFile.url} alt={displayFilename(selectedFile.filename)} className="media-card-thumb" />
            </div>
            <div className="form-group">
              <label>Tamano</label>
              <div className="media-size-grid">
                {(["sm", "md", "lg", "full"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`media-size-option${size === option ? " is-selected" : ""}`}
                    onClick={() => setSize(option)}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="media-wizard-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWizardStep(pendingUploadedFile ? 2 : 1)}>
                Atras
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={completeMarkdownInsert}>
                Insertar en Markdown
              </button>
            </div>
          </div>
        ) : null}

        {(!markdownMode || currentStep === 1) ? (
        <div className="editor-modal-list media-grid" style={{ maxHeight: "360px", overflowY: "auto" }}>
          {loading ? (
            <div className="text-sm text-muted">Cargando galeria...</div>
          ) : files.length === 0 ? (
            <div className="text-sm text-muted">No hay imagenes subidas.</div>
          ) : (
            files.map((file) => (
              <div
                key={file.filename}
                className="media-card"
              >
                <button
                  type="button"
                  className="media-card-select"
                  onClick={() => {
                    if (!markdownMode) {
                      onClose(file.url);
                      return;
                    }
                    setPendingUploadedFile(null);
                    setSelectedFile(file);
                    setAltText("Imagen");
                    setSize("full");
                    setWizardStep(3);
                  }}
                >
                  <img src={file.url} alt={displayFilename(file.filename)} className="media-card-thumb" />
                  <span className="title">{displayFilename(file.filename)}</span>
                </button>
                <button type="button" className="btn btn-danger btn-sm media-card-delete" aria-label={`Eliminar ${file.filename}`} disabled={deleting === file.filename} onClick={() => deleteFile(file.filename)}>
                  {deleting === file.filename ? "..." : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3,6 5,6 21,6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>}
                </button>
              </div>
            ))
          )}
        </div>
        ) : null}
      </div>
    </div>
  );
}

async function open(): Promise<string | null> {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const root = createRoot(mount);
  return new Promise((resolve) => {
    const done = (value: string | ImageInsertResult | null) => {
      root.unmount();
      mount.remove();
      resolve(typeof value === "string" ? value : value?.url || null);
    };
    root.render(<MediaPickerModal onClose={done} />);
  });
}

async function openForMarkdown(): Promise<ImageInsertResult | null> {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const root = createRoot(mount);
  return new Promise((resolve) => {
    const done = (value: string | ImageInsertResult | null) => {
      root.unmount();
      mount.remove();
      resolve(typeof value === "string" ? { markdown: `![Imagen](${value})`, url: value } : value);
    };
    root.render(<MediaPickerModal onClose={done} markdownMode />);
  });
}

export function registerMediaPickerRenderer() {
  window.CMSMediaPicker = { open, openForMarkdown };
}
