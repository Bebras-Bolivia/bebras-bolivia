import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Frontmatter = {
  title: string;
  description: string;
  date: string;
  author: string;
};

type MarkdownAction = {
  label: string;
  title: string;
  onClick: () => void;
};

interface Props {
  isNew: boolean;
  slug: string;
  frontmatter: Frontmatter;
  body: string;
  icons: Record<string, string>;
  onBack: () => void;
  onSave: (payload: { slug: string; frontmatter: Frontmatter; body: string }) => Promise<void>;
}

function iconHtml(icons: Record<string, string>, name: string): { __html: string } {
  return { __html: icons[name] || "" };
}

declare global {
  interface Window {
    API: any;
    App: any;
    Toast: any;
    CMSMediaPicker?: {
      open: () => Promise<string | null>;
      openForMarkdown: () => Promise<{ markdown: string; url: string } | null>;
    };
  }
}

export default function BlogEditorView({ isNew, slug, frontmatter, body, icons, onBack, onSave }: Props) {
  const [formSlug, setFormSlug] = useState(slug || "");
  const [title, setTitle] = useState(frontmatter.title || "");
  const [description, setDescription] = useState(frontmatter.description || "");
  const [date, setDate] = useState(frontmatter.date || new Date().toISOString().split("T")[0]);
  const [markdown, setMarkdown] = useState(body || "");
  const [saving, setSaving] = useState(false);
  const [previewFrameSrc, setPreviewFrameSrc] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const syncTimer = useRef<number | null>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [headerContextSlot, setHeaderContextSlot] = useState<HTMLElement | null>(null);
  const previewRevision = useRef(0);
  const markdownRef = useRef<HTMLTextAreaElement | null>(null);

  const previewPayload = useMemo(() => ({
    slug: formSlug.trim(),
    frontmatter: {
      title: title.trim(),
      description: description.trim(),
      date,
      author: "Bebras Bolivia",
    },
    body: markdown,
  }), [formSlug, title, description, date, markdown]);

  useEffect(() => {
    let cancelled = false;
    const currentRevision = ++previewRevision.current;

    async function ensurePreviewServer() {
      const status = await window.API.previewStatus().catch(() => null);
      if (status?.running) return status;
      return window.API.startPreview();
    }

    async function syncPreview() {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const previewStatus = await ensurePreviewServer();
        const result = await window.API.syncBlogPreviewDraft(
          previewPayload.slug,
          previewPayload.frontmatter,
          previewPayload.body,
          true
        );

        if (cancelled || currentRevision !== previewRevision.current) return;

        if (previewStatus?.mode === "static") {
          setPreviewError("La vista previa en vivo del blog necesita el servidor de desarrollo activo.");
        }

        // Astro content collections can lag one file-change cycle behind if the
        // iframe reloads before the dev server finishes re-indexing the draft.
        // Give the blog preview extra settle time so it doesn't show one edit behind.
        await new Promise((resolve) => window.setTimeout(resolve, 900));

        if (cancelled || currentRevision !== previewRevision.current) return;

        const targetPath = `/preview-site/blog/${encodeURIComponent(result.slug)}/`;
        setPreviewFrameSrc(`${window.App.appUrl(targetPath)}?t=${Date.now()}`);
        setPreviewReady(true);
      } catch (err: any) {
        if (cancelled) return;
        setPreviewError(err?.message || "No se pudo generar la vista previa del post.");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(syncPreview, 700);

    return () => {
      cancelled = true;
      if (syncTimer.current) {
        window.clearTimeout(syncTimer.current);
        syncTimer.current = null;
      }
    };
  }, [previewPayload, isNew]);

  useEffect(() => {
    return () => {
      window.API.cleanupBlogPreviewDraft().catch(() => {});
    };
  }, []);

  useEffect(() => {
    setHeaderSlot(document.getElementById("header-editor-actions"));
    setHeaderContextSlot(document.getElementById("header-context-actions"));
  }, []);

  const handleSave = async () => {
    if (!formSlug.trim() || !title.trim() || !description.trim() || !date) {
      return;
    }
    setSaving(true);
    try {
      await onSave({
        slug: formSlug.trim(),
        frontmatter: {
          title: title.trim(),
          description: description.trim(),
          date,
          author: "Bebras Bolivia",
        },
        body: markdown,
      });
    } finally {
      setSaving(false);
    }
  };

  const insertAtCursor = (text: string) => {
    const textarea = markdownRef.current;
    if (!textarea) {
      setMarkdown((prev) => `${prev}${prev.endsWith("\n") || prev.length === 0 ? "" : "\n\n"}${text}`);
      return;
    }

    const start = textarea.selectionStart ?? markdown.length;
    const end = textarea.selectionEnd ?? markdown.length;
    const nextValue = `${markdown.slice(0, start)}${text}${markdown.slice(end)}`;
    setMarkdown(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + text.length;
      textarea.setSelectionRange(caret, caret);
    });
  };

  const replaceSelection = (transform: (selected: string) => { text: string; selectStart?: number; selectEnd?: number }) => {
    const textarea = markdownRef.current;
    const start = textarea?.selectionStart ?? markdown.length;
    const end = textarea?.selectionEnd ?? markdown.length;
    const selected = markdown.slice(start, end);
    const result = transform(selected);
    const nextValue = `${markdown.slice(0, start)}${result.text}${markdown.slice(end)}`;
    setMarkdown(nextValue);

    window.requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      const nextStart = start + (result.selectStart ?? result.text.length);
      const nextEnd = start + (result.selectEnd ?? result.text.length);
      textarea.setSelectionRange(nextStart, nextEnd);
    });
  };

  const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
    replaceSelection((selected) => {
      const content = selected || placeholder;
      return {
        text: `${prefix}${content}${suffix}`,
        selectStart: prefix.length,
        selectEnd: prefix.length + content.length,
      };
    });
  };

  const prefixLines = (prefixFactory: (index: number) => string, placeholder: string) => {
    replaceSelection((selected) => {
      const content = selected || placeholder;
      const lines = content.split("\n");
      const next = lines.map((line, index) => `${prefixFactory(index)}${line || placeholder}`).join("\n");
      return { text: next };
    });
  };

  const insertHeading = (level: number) => {
    const hashes = "#".repeat(level);
    replaceSelection((selected) => {
      const content = selected || "Titulo";
      return {
        text: `${hashes} ${content}`,
        selectStart: hashes.length + 1,
        selectEnd: hashes.length + 1 + content.length,
      };
    });
  };

  const insertSeparator = () => {
    insertAtCursor(`${markdown.length > 0 && !markdown.endsWith("\n") ? "\n" : ""}\n---\n\n`);
  };

  const insertLink = () => {
    replaceSelection((selected) => {
      const label = selected || "Texto del enlace";
      const url = "https://";
      return {
        text: `[${label}](${url})`,
        selectStart: label.length + 3,
        selectEnd: label.length + 11,
      };
    });
  };

  const handleInsertImage = async () => {
    try {
      const selected = await window.CMSMediaPicker?.openForMarkdown?.();
      if (!selected) return;
      const needsSpacing = markdown.length > 0 && !markdown.endsWith("\n");
      insertAtCursor(`${needsSpacing ? "\n\n" : ""}${selected.markdown}\n`);
    } catch (err: any) {
      window.Toast.error(err?.message || "No se pudo abrir la galeria de imagenes");
    }
  };

  const actions: MarkdownAction[] = [
    { label: "H1", title: "Titulo grande", onClick: () => insertHeading(1) },
    { label: "H2", title: "Subtitulo", onClick: () => insertHeading(2) },
    { label: "H3", title: "Subtitulo pequeno", onClick: () => insertHeading(3) },
    { label: "B", title: "Negrita", onClick: () => wrapSelection("**", "**", "texto") },
    { label: "I", title: "Cursiva", onClick: () => wrapSelection("*", "*", "texto") },
    { label: "Lista", title: "Lista con viñetas", onClick: () => prefixLines(() => "- ", "Elemento") },
    { label: "1.", title: "Lista numerada", onClick: () => prefixLines((index) => `${index + 1}. `, "Elemento") },
    { label: ">", title: "Cita", onClick: () => prefixLines(() => "> ", "Cita") },
    { label: "Link", title: "Enlace", onClick: insertLink },
    { label: "Img", title: "Insertar imagen", onClick: handleInsertImage },
    { label: "---", title: "Separador", onClick: insertSeparator },
  ];

  return (
    <>
      {headerSlot
        ? createPortal(
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} aria-label={isNew ? "Crear publicación" : "Guardar publicación"}>
              {saving ? (
                <>
                  <div className="spinner" style={{ width: "14px", height: "14px" }}></div> Guardando...
                </>
              ) : (
                <>
                  <span dangerouslySetInnerHTML={iconHtml(icons, "save")}></span> {isNew ? "Crear" : "Guardar"}
                </>
              )}
            </button>,
            headerSlot
          )
        : null}

      {headerContextSlot
        ? createPortal(
            <button className="btn btn-ghost btn-sm" onClick={onBack} aria-label="Volver al blog">
              &larr; Volver al blog
            </button>,
            headerContextSlot
          )
        : null}

      <div className="editor-layout">
        <div className="editor-form" id="blog-form-react">
          <div className="form-group">
            <label htmlFor="blog-slug-react">Slug (URL)</label>
            <input
              type="text"
              id="blog-slug-react"
              className="form-input mono"
              value={formSlug}
              placeholder="mi-nuevo-post"
              pattern="[a-z0-9\-]+"
              title="Solo letras minusculas, numeros y guiones"
              onChange={(e) => setFormSlug(e.target.value)}
              disabled={!isNew}
            />
            {isNew && (
              <span className="text-sm text-muted">
                Solo letras minusculas, numeros y guiones. No se puede cambiar despues.
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="blog-title-react">Titulo</label>
            <input type="text" id="blog-title-react" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="blog-desc-react">Descripcion</label>
            <textarea id="blog-desc-react" className="form-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="blog-date-react">Fecha</label>
            <input type="date" id="blog-date-react" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="divider"></div>

          <div className="form-group">
            <label htmlFor="blog-body-react">Contenido (Markdown)</label>
            <div className="blog-markdown-toolbar" role="toolbar" aria-label="Atajos de Markdown">
              {actions.map((action) => (
                <button
                  key={action.label + action.title}
                  type="button"
                  className="btn btn-ghost btn-sm blog-markdown-tool"
                  title={action.title}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <textarea
              id="blog-body-react"
              className="form-textarea mono"
              rows={20}
              style={{ minHeight: "300px" }}
              ref={markdownRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="editor-preview blog-live-preview">
          <div className="blog-preview-shell" id="blog-preview-content">
            <div className="blog-preview-toolbar">
              <div className="blog-preview-badge">Vista previa real</div>
              <div className="blog-preview-status">
                {previewLoading ? "Actualizando..." : previewError ? "Con incidencias" : previewReady ? "Sincronizada" : "Pendiente"}
              </div>
            </div>

            {previewError ? (
              <div className="blog-preview-fallback">
                <h3>No se pudo cargar la vista previa</h3>
                <p>{previewError}</p>
              </div>
            ) : previewFrameSrc ? (
              <iframe
                title="Vista previa del post"
                className="blog-preview-frame"
                src={previewFrameSrc}
              />
            ) : (
              <div className="blog-preview-fallback">
                <h3>Preparando vista previa</h3>
                <p>Espera un momento mientras el CMS sincroniza el borrador con la página real del blog.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
