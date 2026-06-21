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
  icon: React.ReactNode;
  onClick: () => void;
  group?: string;
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
      } catch (err: unknown) {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "No se pudo generar la vista previa del post.");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    } catch (err: unknown) {
      window.Toast.error(err instanceof Error ? err.message : "No se pudo abrir la galeria de imagenes");
    }
  };

  const actions: MarkdownAction[] = [
    /* ── Headings ── */
    { label: "H1", title: "Título grande", group: "heading", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 12l3-2v8"/></svg>, onClick: () => insertHeading(1) },
    { label: "H2", title: "Subtítulo", group: "heading", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>, onClick: () => insertHeading(2) },
    { label: "H3", title: "Subtítulo pequeño", group: "heading", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>, onClick: () => insertHeading(3) },
    /* ── Text formatting ── */
    { label: "B", title: "Negrita", group: "format", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>, onClick: () => wrapSelection("**", "**", "texto") },
    { label: "I", title: "Cursiva", group: "format", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>, onClick: () => wrapSelection("*", "*", "texto") },
    /* ── Lists & quote ── */
    { label: "Lista", title: "Lista con viñetas", group: "list", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>, onClick: () => prefixLines(() => "- ", "Elemento") },
    { label: "1.", title: "Lista numerada", group: "list", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>, onClick: () => prefixLines((index) => `${index + 1}. `, "Elemento") },
    { label: ">", title: "Cita", group: "list", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 5H3"/><path d="M21 12H8"/><path d="M21 19H8"/><path d="M3 12v7"/></svg>, onClick: () => prefixLines(() => "> ", "Cita") },
    /* ── Insert ── */
    { label: "Link", title: "Enlace", group: "insert", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, onClick: insertLink },
    { label: "Img", title: "Insertar imagen", group: "insert", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, onClick: handleInsertImage },
    { label: "---", title: "Separador horizontal", group: "insert", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>, onClick: insertSeparator },
  ];

  /* Group actions by their group key to render separators */
  // eslint-disable-next-line react-hooks/refs
  const groupedActions = actions.reduce<{ group: string; items: MarkdownAction[] }[]>((acc, action) => {
    const last = acc[acc.length - 1];
    if (last && last.group === (action.group || "")) {
      last.items.push(action);
    } else {
      acc.push({ group: action.group || "", items: [action] });
    }
    return acc;
  }, []);


  return (
    <>
      {headerSlot
        ? createPortal(
            <button
              className="btn btn-primary btn-sm"
              id="editor-save"
              onClick={handleSave}
              disabled={saving}
              aria-label={isNew ? "Crear publicación" : "Guardar publicación"}
              title={isNew ? "Crear publicación" : "Guardar publicación"}
            >
              {saving ? (
                <>
                  <div className="spinner" style={{ width: "14px", height: "14px", display: "inline-block" }}></div>{" "}
                  <span className="btn-text">{isNew ? "Creando..." : "Guardando..."}</span>
                </>
              ) : (
                <>
                  <span dangerouslySetInnerHTML={iconHtml(icons, "save")}></span>{" "}
                  <span className="btn-text">{isNew ? "Crear" : "Guardar"}</span>
                </>
              )}
            </button>,
            headerSlot
          )
        : null}

      {headerContextSlot
        ? createPortal(
            <button className="btn btn-ghost btn-sm" onClick={onBack} aria-label="Volver al blog">
              <span aria-hidden="true">&larr;</span>
              <span className="btn-text">Volver al blog</span>
            </button>,
            headerContextSlot
          )
        : null}

      <div className="editor-layout">
        <div className="editor-form" id="blog-form-react">
          <div className="editor-group">
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
          </div>

          <div className="divider"></div>

          <div className="form-group">
            <label htmlFor="blog-body-react">Contenido (Markdown)</label>
            <div className="blog-markdown-toolbar" role="toolbar" aria-label="Atajos de Markdown">
              {groupedActions.map((group, gi) => (
                <React.Fragment key={group.group}>
                  {gi > 0 && <span className="md-toolbar-sep" aria-hidden="true" />}
                  <div className="md-toolbar-group">
                    {group.items.map((action) => (
                      <button
                        key={action.label + action.title}
                        type="button"
                        className="md-tool-btn"
                        title={action.title}
                        aria-label={action.title}
                        onClick={action.onClick}
                      >
                        <span className="md-tool-icon">{action.icon}</span>
                      </button>
                    ))}
                  </div>
                </React.Fragment>
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
