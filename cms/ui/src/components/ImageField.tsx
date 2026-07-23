import React from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg"]);

export type ImageUploadScope = "blog" | "content" | "sponsors";
type ImageSource = "url" | "upload";

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

function isValidExternalUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function sourceFromValue(value: string): ImageSource {
  return externalUrlValue(value) ? "url" : "upload";
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
  const [source, setSource] = React.useState<ImageSource>(sourceFromValue(externalUrl));
  const previewUrl = imageUrl ? window.App.appUrl(imageUrl) : "";
  const activeSource = allowExternalUrl ? source : "upload";
  const currentSource = sourceFromValue(imageUrl);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageUrl(externalUrl);
    setUrlDraft(externalUrlValue(externalUrl));
    if (externalUrl) setSource(sourceFromValue(externalUrl));
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

  function updateImage(nextUrl: string, expectedId = id, nextSource = sourceFromValue(nextUrl)) {
    if (!mountedRef.current || fieldIdRef.current !== expectedId) return;
    setImageUrl(nextUrl);
    setUrlDraft(externalUrlValue(nextUrl));
    setSource(nextSource);
    onChange(nextUrl);
  }

  function changeExternalUrl(nextDraft: string) {
    setUrlDraft(nextDraft);
    const nextUrl = nextDraft.trim();
    if (!nextUrl) {
      updateImage("", id, "url");
      return;
    }

    if (isValidExternalUrl(nextUrl)) updateImage(nextUrl, id, "url");
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
        if (activeSource !== "upload") return;
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
        if (activeSource !== "upload") return;
        const file = event.dataTransfer.files[0];
        if (file) void uploadFile(file);
      }}
    >
      {allowExternalUrl ? (
        <div className="image-source-tabs" role="tablist" aria-label="Fuente de la imagen">
          <button
            type="button"
            role="tab"
            aria-selected={activeSource === "url"}
            className={activeSource === "url" ? "is-active" : ""}
            onClick={() => {
              setDragActive(false);
              setSource("url");
            }}
          >
            URL externa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSource === "upload"}
            className={activeSource === "upload" ? "is-active" : ""}
            onClick={() => setSource("upload")}
          >
            Subir archivo
          </button>
        </div>
      ) : null}

      <div className="image-field-preview" aria-live="polite">
        {previewUrl ? (
          <img src={previewUrl} alt={label || "Vista previa"} draggable={false} />
        ) : (
          <span>Sin imagen</span>
        )}
      </div>

      <div className="image-field-content">
        {activeSource === "upload" ? (
          <>
            <strong>{uploading ? "Subiendo imagen..." : "Arrastra una imagen aquí"}</strong>
            <span>JPG, PNG, WebP, GIF o SVG. Máximo 5 MB.</span>
            {imageUrl && currentSource === "url" ? (
              <span className="image-source-note">La URL actual se mantendrá hasta completar una nueva carga.</span>
            ) : null}
            <div className="image-field-actions">
              <button type="button" className="btn btn-secondary btn-sm" aria-label="Subir un archivo" title="Subir un archivo" disabled={uploading} onClick={() => inputRef.current?.click()}>
                Seleccionar archivo
              </button>
              {imageUrl && currentSource === "upload" ? (
                <button type="button" className="btn btn-ghost btn-sm image-field-remove" aria-label="Quitar el archivo" title="Quitar el archivo" disabled={uploading} onClick={() => updateImage("")}>
                  Quitar archivo
                </button>
              ) : null}
            </div>
            {imageUrl && currentSource === "upload" ? <code className="image-field-path">{imageUrl}</code> : null}
          </>
        ) : (
          <>
            <strong>URL externa</strong>
            <span>Pega el enlace directo a una imagen pública.</span>
            {imageUrl && currentSource === "upload" ? (
              <span className="image-source-note">El archivo actual se mantendrá hasta ingresar una URL válida.</span>
            ) : null}
            <div className="image-field-url-row">
              <input
                className="form-input"
                type="url"
                inputMode="url"
                maxLength={500}
                placeholder="https://ejemplo.com/imagen.svg"
                value={urlDraft}
                disabled={uploading}
                onChange={(event) => changeExternalUrl(event.target.value)}
              />
            </div>
            {urlDraft.trim() && !isValidExternalUrl(urlDraft.trim()) ? (
              <span className="image-url-status">Completa una URL http o https para actualizar la imagen.</span>
            ) : null}
          </>
        )}
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
