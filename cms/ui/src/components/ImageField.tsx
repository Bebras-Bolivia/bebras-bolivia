import React from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg"]);

export type ImageUploadScope = "blog" | "content" | "sponsors";

interface Props {
  id?: string;
  label?: string;
  value: string | number | boolean;
  onChange: (next: string) => void;
  allowExternalUrl?: boolean;
  uploadScope?: ImageUploadScope;
}

function validateImage(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(extension)) return "Usa una imagen JPG, PNG, WebP, GIF o SVG.";
  if (file.size > MAX_FILE_SIZE) return "La imagen no puede superar 5 MB.";
  return null;
}

function externalUrlValue(value: string): string {
  return /^https?:\/\//i.test(value) ? value : "";
}

export default function ImageField({
  id,
  label,
  value,
  onChange,
  allowExternalUrl = false,
  uploadScope = "sponsors",
}: Props) {
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mountedRef = React.useRef(true);
  const uploadingRef = React.useRef(false);
  const fieldIdRef = React.useRef(id);
  const externalUrl = String(value ?? "").trim();
  const [imageUrl, setImageUrl] = React.useState(externalUrl);
  const [urlDraft, setUrlDraft] = React.useState(externalUrlValue(externalUrl));
  const previewUrl = imageUrl ? window.App.appUrl(imageUrl) : "";

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageUrl(externalUrl);
    setUrlDraft(externalUrlValue(externalUrl));
  }, [externalUrl]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    fieldIdRef.current = id;
  }, [id]);

  function updateImage(nextUrl: string, expectedId = id) {
    if (!mountedRef.current || fieldIdRef.current !== expectedId) return;
    setImageUrl(nextUrl);
    setUrlDraft(externalUrlValue(nextUrl));
    onChange(nextUrl);
  }

  function applyExternalUrl() {
    const nextUrl = urlDraft.trim();
    if (!nextUrl) return;

    try {
      const parsed = new URL(nextUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      window.Toast.error("Ingresa una URL http o https válida");
      return;
    }

    updateImage(nextUrl);
  }

  async function uploadFile(file: File) {
    if (uploadingRef.current) {
      window.Toast.error("Espera a que termine la carga actual");
      return;
    }

    const validationError = validateImage(file);
    if (validationError) {
      window.Toast.error(validationError);
      return;
    }

    uploadingRef.current = true;
    if (mountedRef.current) setUploading(true);
    const uploadFieldId = id;
    try {
      const result = await window.API.uploadMedia(file, uploadScope);
      const nextUrl = String(result?.url || "");
      if (!nextUrl) throw new Error("La carga no devolvio una ruta de imagen");
      updateImage(nextUrl, uploadFieldId);
      window.Toast.success("Imagen cargada");
    } catch (error) {
      window.Toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      uploadingRef.current = false;
      if (mountedRef.current) setUploading(false);
    }
  }

  function stopDragEvent(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      className={`image-field${dragActive ? " is-dragging" : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
      onDragEnter={(event) => {
        stopDragEvent(event);
        setDragActive(true);
      }}
      onDragOver={stopDragEvent}
      onDragLeave={(event) => {
        stopDragEvent(event);
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragActive(false);
      }}
      onDrop={(event) => {
        stopDragEvent(event);
        setDragActive(false);
        const file = event.dataTransfer.files[0];
        if (file) void uploadFile(file);
      }}
    >
      <div className="image-field-preview" aria-live="polite">
        {previewUrl ? (
          <img src={previewUrl} alt={label || "Vista previa"} draggable={false} />
        ) : (
          <span>Sin imagen</span>
        )}
      </div>

      <div className="image-field-content">
        <strong>{uploading ? "Subiendo imagen..." : "Arrastra una imagen aqui"}</strong>
        <span>JPG, PNG, WebP, GIF o SVG. Máximo 5 MB.</span>
        <div className="image-field-actions">
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Subir un archivo" title="Subir un archivo" disabled={uploading} onClick={() => inputRef.current?.click()}>
            Subir
          </button>
          {imageUrl ? (
            <button type="button" className="btn btn-ghost btn-sm image-field-remove" aria-label="Quitar la imagen" title="Quitar la imagen" disabled={uploading} onClick={() => updateImage("")}>
              Quitar
            </button>
          ) : null}
        </div>
        {imageUrl ? <code className="image-field-path">{imageUrl}</code> : null}
        {allowExternalUrl ? (
          <div className="image-field-url">
            <span>o usa una URL externa</span>
            <div className="image-field-url-row">
              <input
                className="form-input"
                type="url"
                inputMode="url"
                maxLength={500}
                placeholder="https://ejemplo.com/imagen.svg"
                value={urlDraft}
                disabled={uploading}
                onChange={(event) => setUrlDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  applyExternalUrl();
                }}
              />
              <button type="button" className="btn btn-secondary btn-sm" disabled={uploading || !urlDraft.trim() || urlDraft.trim() === imageUrl} onClick={applyExternalUrl}>
                Usar URL
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <input
        id={id}
        ref={inputRef}
        className="image-field-input"
        type="file"
        aria-label={label}
        accept=".jpg,.jpeg,.png,.webp,.gif,.svg,image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
